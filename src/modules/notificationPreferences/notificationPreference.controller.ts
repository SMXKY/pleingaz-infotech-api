import { Request, Response, NextFunction } from "express";
import { NotificationPreferencesService } from "./notificationPreference.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "@utils/catchAsync.util";
import { updateNotificationPreferencesSchema } from "./notificationPreference.schema";
import { ServiceContext } from "@appTypes/base.types";
import { BaseController } from "src/base/BaseController";
import { NotificationPreference } from "src/generated/prisma";

export class NotificationPreferencesController extends BaseController<NotificationPreference> {
  protected service: NotificationPreferencesService;

  constructor() {
    super();
    this.service = new NotificationPreferencesService();
  }

  get = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const ctx = this.getContext(req, res);
    const preferences = await this.service.get(ctx);
    appResponder(StatusCodes.OK, preferences, res);
  });

  updatePreference = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const ctx = this.getContext(req, res);
      const data = updateNotificationPreferencesSchema.parse(req.body);
      const preferences = await this.service.updatePreference(data, ctx);
      appResponder(StatusCodes.OK, preferences, res);
    }
  );

  reset = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const ctx = this.getContext(req, res);
      const preferences = await this.service.reset(ctx);
      appResponder(StatusCodes.OK, preferences, res);
    }
  );
}
