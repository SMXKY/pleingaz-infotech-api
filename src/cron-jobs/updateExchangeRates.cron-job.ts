import cron from "node-cron";
import axios from "axios";
import { Currency } from "@appTypes/preferences.type";
import { UNIRATEAPI_KEY } from "@utils/environmentVariablesCheck.util";
import prisma from "@models/index.model";

const PAIRS: { from: string; to: string }[] = [
  { from: "USD", to: "XAF" },
  { from: "EUR", to: "XAF" },
  { from: "USD", to: "EUR" },
  { from: "EUR", to: "USD" },
  { from: "XAF", to: "USD" },
  { from: "XAF", to: "EUR" },
];

interface UniRateResponse {
  result: number;
  [key: string]: any;
}

const fetchRate = async (from: string, to: string): Promise<number | null> => {
  try {
    const response = await axios.get<UniRateResponse>(
      `https://api.unirateapi.com/api/convert`,
      {
        params: {
          api_key: UNIRATEAPI_KEY,
          from,
          to,
          amount: 1,
        },
        timeout: 10000,
      }
    );

    const rate = response.data?.result;

    if (!rate || typeof rate !== "number" || rate <= 0) {
      console.error(
        `[ExchangeRate] Invalid rate received for ${from}→${to}:`,
        response.data
      );
      return null;
    }

    return rate;
  } catch (err: any) {
    console.error(
      `[ExchangeRate] Failed to fetch ${from}→${to}:`,
      err?.message
    );
    return null;
  }
};

const fetchRateWithRetry = async (
  from: string,
  to: string,
  retries = 2
): Promise<number | null> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const rate = await fetchRate(from, to);
    if (rate !== null) return rate;

    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  return null;
};

export const syncExchangeRates = async (): Promise<void> => {
  console.log("[ExchangeRate] Starting daily sync...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results = await Promise.allSettled(
    PAIRS.map(async ({ from, to }) => {
      const rate = await fetchRateWithRetry(from, to);

      if (rate === null) {
        throw new Error(`No rate received for ${from}→${to}`);
      }

      await prisma.exchangeRate.upsert({
        where: {
          fromCurrency_toCurrency_effectiveDate: {
            fromCurrency: from as Currency,
            toCurrency: to as Currency,
            effectiveDate: today,
          },
        },
        update: {
          rate,
          source: "api",
        },
        create: {
          fromCurrency: from as Currency,
          toCurrency: to as Currency,
          rate,
          effectiveDate: today,
          source: "api",
        },
      });

      console.log(`[ExchangeRate] Saved ${from}→${to}: ${rate}`);
    })
  );

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    console.error(`[ExchangeRate] ${failures.length} pair(s) failed to sync`);
    failures.forEach((f) => {
      if (f.status === "rejected") {
        console.error(`[ExchangeRate] ${f.reason}`);
      }
    });
  } else {
    console.log("[ExchangeRate] Daily sync completed successfully");
  }
};

export const registerExchangeRateCron = (): void => {
  cron.schedule(
    "0 7 * * *",
    async () => {
      await syncExchangeRates();
    },
    {
      timezone: "UTC",
    }
  );

  console.log(
    "[ExchangeRate] Cron job registered — runs daily at 08:00 Cameroon time"
  );
};
