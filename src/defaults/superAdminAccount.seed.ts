import * as dotenv from "dotenv";
import { UserStatus } from "@appTypes/user.types";
import prisma from "@models/index.model";
import argon2 from "argon2";
import { Language } from "src/generated/prisma";
import { Currency } from "@appTypes/preferences.type";
dotenv.config();

export const seedSuperAdmin = async (): Promise<void> => {
  const {
    SUPER_ADMIN_EMAIL,
    SUPER_ADMIN_PASSWORD,
    SUPER_ADMIN_FIRST_NAME,
    SUPER_ADMIN_LAST_NAME,
    SUPER_ADMIN_USERNAME,
  } = process.env;

  if (
    !SUPER_ADMIN_EMAIL ||
    !SUPER_ADMIN_PASSWORD ||
    !SUPER_ADMIN_FIRST_NAME ||
    !SUPER_ADMIN_LAST_NAME ||
    !SUPER_ADMIN_USERNAME
  ) {
    console.warn("⚠️ Super Admin env vars missing. Skipping.");
    return;
  }

  const exists = await prisma.user.findUnique({
    where: { email: SUPER_ADMIN_EMAIL },
  });
  if (exists) {
    console.log("ℹ️ Super admin already exists, skipping.");
    return;
  }

  const superAdminRole = await prisma.role.findFirst({
    where: { name: "Administrateur Système (System Admin)" },
  });
  if (!superAdminRole) {
    console.error("❌ 'super admin' role not found. Seed roles first.");
    return;
  }

  const department = await prisma.department.findFirst({
    where: { code: "IT" },
  });
  if (!department) {
    console.error("❌ IT department not found. Seed departments first.");
    return;
  }

  const hashedPassword = await argon2.hash(SUPER_ADMIN_PASSWORD);
  const [adminUser] = await prisma.$transaction([
    prisma.user.create({
      data: {
        email: SUPER_ADMIN_EMAIL,
        password: hashedPassword,
        name: SUPER_ADMIN_FIRST_NAME,
        surname: SUPER_ADMIN_LAST_NAME,
        username: SUPER_ADMIN_USERNAME,
        phoneNumber: "670000000",
        isEmailVerified: true,
        status: UserStatus.ACTIVE,
        roleId: superAdminRole.id,
        nationalIdNumber: "00000000",
        employeeId: "SYS-001",
        isSystem: true,
        passwordChangedAt: new Date(),
        gender: "M",
        hireDate: new Date(),
        departmentId: department.id,
      },
    }),
  ]);

  await prisma.$transaction([
    prisma.userPreference.create({
      data: {
        userId: adminUser.id,
        language: Language.ENG,
        currency: Currency.FCFA,
      },
    }),
  ]);

  console.log(`✅ Super admin created: ${adminUser.email}`);
};

export default seedSuperAdmin;
