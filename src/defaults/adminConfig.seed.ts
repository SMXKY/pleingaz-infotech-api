import { ConfigType } from "src/generated/prisma";
import prisma from "@models/index.model";
import * as dotenv from "dotenv";
dotenv.config();

export const seedAdminConfig = async (): Promise<void> => {
  const exists = await prisma.adminConfig.findUnique({
    where: { id: ConfigType.MAIN },
  });

  if (exists) {
    console.log("ℹ️ Admin config already exists, skipping.");
    return;
  }

  await prisma.adminConfig.create({
    data: {
      id: ConfigType.MAIN,
      companyEmail: process.env.COMPANY_EMAIL ?? "admin@pleingaz.com",
      supportEmail: process.env.SUPPORT_EMAIL ?? "support@pleingaz.com",
      companyPhoneNumber: process.env.COMPANY_PHONE ?? "670000000",
      companyPrefix: process.env.COMPANY_PREFIX ?? "INFOTECH",
    },
  });

  console.log("✅ Admin config seeded.");
};
