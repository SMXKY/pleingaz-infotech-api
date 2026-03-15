import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { AdminConfigService } from "./financeSettings.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { AdminConfig } from "src/generated/prisma";

export class AdminConfigController extends BaseController<AdminConfig> {
  protected service: AdminConfigService;

  constructor() {
    super();
    this.service = new AdminConfigService();
  }

  findWildCards = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const AdminConfigs = await this.service.findWildCardAdminConfigs(ctx);
      appResponder(StatusCodes.OK, AdminConfigs, res);
    } catch (error) {
      next(error);
    }
  };
}
