import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { PermissionService } from "./permission.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { Permission } from "src/generated/prisma";
import { catchAsync } from "@utils/catchAsync.util";
import { AppError } from "@utils/AppError.util";
import t from "@utils/translate.util";
import { permissionOverideSchema } from "./permission.schema";

export class PermissionController extends BaseController<Permission> {
  protected service: PermissionService;

  constructor() {
    super();
    this.service = new PermissionService();
  }

  findWildCards = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const Permissions = await this.service.findWildCardPermissions(ctx);
      appResponder(StatusCodes.OK, Permissions, res);
    } catch (error) {
      next(error);
    }
  };

  permissionOverride = catchAsync(async (req: Request, res: Response) => {
    const validation = permissionOverideSchema.safeParse(req.body);
    if (!validation.success) {
      const message = validation.error.issues[0].message;
      throw new AppError(message, StatusCodes.BAD_REQUEST);
    }

    const ctx = this.getContext(req, res);
    const result = await this.service.permissionOverride(
      validation.data,
      ctx,
      res
    );

    appResponder(
      StatusCodes.CREATED,
      {
        message: t(res.locals.lang, result.message),
      },
      res
    );
  });

  revokePermissionOverride = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const ctx = this.getContext(req, res);
      if (!req.body.userId || !req.body.permissionId) {
        return next(
          new AppError(
            "error.req.invalid_request_body",
            StatusCodes.BAD_REQUEST
          )
        );
      }
      const result = await this.service.revokePermissionOverride(req.body, ctx);
      appResponder(
        StatusCodes.OK,
        {
          message: t(res.locals.lang, result.message),
        },
        res
      );
    }
  );
}
