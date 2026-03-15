import { BaseService } from "src/base/BaseService";
import { ExchangeRateRepository } from "./exchangeRates.repository";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import { ExchangeRate } from "src/generated/prisma";
import { CurrencyExchangeInput } from "./exchangeRates.schema";
import { Currency } from "@appTypes/preferences.type";
import { convertCurrencyNoTransaction } from "@utils/currencyConverter.util";

export class ExchangeRateService extends BaseService<ExchangeRate> {
  protected repository: ExchangeRateRepository;
  protected tableName = "exchange_rates";

  constructor() {
    super();
    this.repository = new ExchangeRateRepository();
  }

  async convertCurrency(
    data: CurrencyExchangeInput,
    ctx: ServiceContext
  ): Promise<{
    from: Currency;
    to: Currency;
    originalAmount: number;
    convertedAmount: number;
  }> {
    const { to, from, amount } = data;

    const convertedAmount = await convertCurrencyNoTransaction(
      amount,
      from,
      to
    );

    return {
      from,
      to,
      originalAmount: amount,
      convertedAmount,
    };
  }
}
