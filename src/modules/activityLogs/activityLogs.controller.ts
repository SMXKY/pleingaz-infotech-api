import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { ActivityLogService } from "./activityLogs.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { ActivityLog } from "src/generated/prisma";

export class ActivityLogController extends BaseController<ActivityLog> {
  protected service: ActivityLogService;

  constructor() {
    super();
    this.service = new ActivityLogService();
  }

  findWildCards = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const ActivityLogs = await this.service.findWildCardActivityLogs(ctx);
      appResponder(StatusCodes.OK, ActivityLogs, res);
    } catch (error) {
      next(error);
    }
  };
}
