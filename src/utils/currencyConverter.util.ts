import { Currency } from "@appTypes/preferences.type";
import { TransactionClient } from "src/modules/users/utilites/generateEmployeeId.util";
import { AppError } from "./AppError.util";
import { StatusCodes } from "http-status-codes";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "src";

const normalizeCurrency = (c: Currency): Currency => c;

const convertCurrency = async (
  tx: TransactionClient,
  amount: number,
  from: Currency,
  to: Currency
): Promise<number> => {
  const normalizedFrom = normalizeCurrency(from);
  const normalizedTo = normalizeCurrency(to);

  if (normalizedFrom === normalizedTo) return amount;

  const rate = await tx.exchangeRate.findFirst({
    where: { fromCurrency: normalizedFrom, toCurrency: normalizedTo },
    orderBy: { effectiveDate: "desc" },
  });

  if (!rate) {
    throw new AppError(
      "error.util.exchange_rate_not_found",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  const result = new Decimal(amount).times(rate.rate).toDecimalPlaces(2);
  return result.toNumber();
};

export const convertCurrencyNoTransaction = async (
  amount: number,
  from: Currency,
  to: Currency
): Promise<number> => {
  const normalizedFrom = normalizeCurrency(from);
  const normalizedTo = normalizeCurrency(to);

  if (normalizedFrom === normalizedTo) return amount;

  const rate = await prisma.exchangeRate.findFirst({
    where: { fromCurrency: normalizedFrom, toCurrency: normalizedTo },
    orderBy: { effectiveDate: "desc" },
  });

  if (!rate) {
    throw new AppError(
      "error.util.exchange_rate_not_found",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  const result = new Decimal(amount).times(rate.rate).toDecimalPlaces(2);
  return result.toNumber();
};

export default convertCurrency;
