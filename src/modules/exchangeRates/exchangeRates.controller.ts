import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { ExchangeRateService } from "./exchangeRates.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { ExchangeRate } from "src/generated/prisma";
import { catchAsync } from "@utils/catchAsync.util";
import { currencyExchangeSchema } from "./exchangeRates.schema";
import { AppError } from "@utils/AppError.util";

export class ExchangeRateController extends BaseController<ExchangeRate> {
  protected service: ExchangeRateService;

  constructor() {
    super();
    this.service = new ExchangeRateService();
  }

  convertCurrency = catchAsync(async (req: Request, res: Response) => {
    const validation = currencyExchangeSchema.safeParse(req.body);
    if (!validation.success) {
      const message = validation.error.issues[0].message;
      throw new AppError(message, StatusCodes.BAD_REQUEST);
    }

    const ctx = this.getContext(req, res);
    const result = await this.service.convertCurrency(validation.data, ctx);

    appResponder(StatusCodes.OK, result, res);
  });
}
