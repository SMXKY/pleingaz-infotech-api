import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { FinanceSettingsService } from "./financeSettings.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { FinanceSettings } from "src/generated/prisma";

export class FinanceSettingsController extends BaseController<FinanceSettings> {
  protected service: FinanceSettingsService;

  constructor() {
    super();
    this.service = new FinanceSettingsService();
  }

  findWildCards = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const FinanceSettings = await this.service.findWildCardFinanceSettingss(
        ctx
      );
      appResponder(StatusCodes.OK, FinanceSettings, res);
    } catch (error) {
      next(error);
    }
  };
}
