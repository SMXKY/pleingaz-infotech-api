import { ConfigType, Prisma } from "src/generated/prisma";
import prisma from "@models/index.model";
import * as dotenv from "dotenv";
dotenv.config();

export const seedFinanceSettings = async (): Promise<void> => {
  try {
    const exists = await prisma.financeSettings.findUnique({
      where: { id: ConfigType.MAIN },
    });

    if (exists) {
      console.log("ℹ️ Admin config already exists, skipping.");
      return;
    }

    await prisma.financeSettings.create({
      data: {
        id: ConfigType.MAIN,
        vatPct: new Prisma.Decimal("19.25"),
        regulatoryTax: new Prisma.Decimal("1.5"),
      },
    });

    console.log("✅ Finance settings seeded.");
  } catch (error) {
    console.error("❌ Failed to seed admin config:", error);
    throw error;
  }
};
