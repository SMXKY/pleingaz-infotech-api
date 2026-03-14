import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { NotificationService } from "./notification.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { Notification } from "src/generated/prisma";
import { AppError } from "@utils/AppError.util";
import { catchAsync } from "@utils/catchAsync.util";
import t from "@utils/translate.util";

export class NotificationController extends BaseController<Notification> {
  protected service: NotificationService;

  constructor() {
    super();
    this.service = new NotificationService();
  }

  findMany = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const options = this.parseFindManyOptions(req);
      const result = await this.service.findMany(options, ctx);
      appResponder(StatusCodes.OK, result.data, res, result.meta);
    } catch (error) {
      next(error);
    }
  };

  findById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const include = this.parseInclude(req.query.include as string);

      const rawId = req.params.id;

      let id: string | undefined;

      if (Array.isArray(rawId)) {
        id = typeof rawId[0] === "string" ? rawId[0] : undefined;
      } else if (typeof rawId === "string") {
        id = rawId;
      }

      if (!id) {
        throw new AppError(
          "error.validation.id_required",
          StatusCodes.BAD_REQUEST
        );
      }

      const record = await this.service.findById(id, ctx, include);
      appResponder(StatusCodes.OK, record as object, res);
    } catch (error) {
      next(error);
    }
  };

  delete = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const soft = req.query.hard !== "true";

      const rawId = req.params.id;

      let id: string | undefined;

      if (Array.isArray(rawId)) {
        id = typeof rawId[0] === "string" ? rawId[0] : undefined;
      } else if (typeof rawId === "string") {
        id = rawId;
      }

      if (!id) {
        throw new AppError(
          "error.validation.id_required",
          StatusCodes.BAD_REQUEST
        );
      }

      await this.service.delete(id, ctx, soft);
      appResponder(
        StatusCodes.OK,
        { message: t(res.locals.lang, "resource.deleted") },
        res
      );
    } catch (error) {
      next(error);
    }
  };

  unReadCount = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const ctx = this.getContext(req, res);
      const count = await this.service.unReadCount(ctx);
      appResponder(StatusCodes.OK, { count }, res);
    }
  );

  markOneAsRead = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const ctx = this.getContext(req, res);

      if (!req.params.id) {
        return next(
          new AppError("error.validation.id_required", StatusCodes.BAD_REQUEST)
        );
      }

      const result = await this.service.markOneAsRead(
        req.params.id as string,
        ctx
      );
      appResponder(StatusCodes.OK, result, res);
    }
  );

  markAllAsRead = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const ctx = this.getContext(req, res);
      const result = await this.service.markAllAsRead(ctx);
      appResponder(StatusCodes.OK, result, res);
    }
  );
}
