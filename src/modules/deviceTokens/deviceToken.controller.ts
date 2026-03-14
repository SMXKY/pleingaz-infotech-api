// deviceToken.controller.ts
import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { DeviceTokenService } from "./deviceToken.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { DeviceToken } from "src/generated/prisma";
import { catchAsync } from "@utils/catchAsync.util";
import { AppError } from "@utils/AppError.util";
import { createDeviceTokenSchema } from "./deviceToken.schema";

export class DeviceTokenController extends BaseController<DeviceToken> {
  protected service: DeviceTokenService;

  constructor() {
    super();
    this.service = new DeviceTokenService();
  }

  register = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const ctx = this.getContext(req, res);
      const data = createDeviceTokenSchema.parse(req.body);
      const token = await this.service.register(data, ctx);
      appResponder(StatusCodes.CREATED, { success: true, id: token.id }, res);
    }
  );

  remove = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const ctx = this.getContext(req, res);

      if (!req.params.token) {
        return next(
          new AppError(
            "error.validation.token_required",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const removed = await this.service.deactivate(
        req.params.token as string,
        ctx
      );

      if (!removed) {
        return next(
          new AppError("error.device_token.not_found", StatusCodes.NOT_FOUND)
        );
      }

      appResponder(StatusCodes.OK, { success: true }, res);
    }
  );

  getMyTokens = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const ctx = this.getContext(req, res);
      const tokens = await this.service.getMyTokens(ctx);
      appResponder(StatusCodes.OK, tokens, res);
    }
  );

  removeAll = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const ctx = this.getContext(req, res);
      const count = await this.service.deactivateAll(ctx);
      appResponder(StatusCodes.OK, { success: true, count }, res);
    }
  );
}
