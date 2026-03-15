import { syncExchangeRates } from "@cron-jobs/updateExchangeRates.cron-job";

import prisma from "@models/index.model";
import * as dotenv from "dotenv";
dotenv.config();

export const seedExchangeRates = async (): Promise<void> => {
  try {
    const exists = await prisma.exchangeRate.count();
    if (exists > 0) {
      console.log("ℹ️ Exchange rates already exist, skipping.");
      return;
    }
    await syncExchangeRates();

    console.log("✅ Exchange rates seeded.");
  } catch (error) {
    console.error("❌ Failed to seed exchange rates:", error);
    throw error;
  }
};
