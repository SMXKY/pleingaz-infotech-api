import * as dotenv from "dotenv";
import { UserStatus } from "@appTypes/user.types";
import prisma from "@models/index.model";
import argon2 from "argon2";
import { Language } from "src/generated/prisma";
import { Currency } from "@appTypes/preferences.type";
dotenv.config();

export const seedTestingAccounts = async (): Promise<void> => {
  await seedCeoAccount();
  await seedAccountantAccount();
};

const seedCeoAccount = async (): Promise<void> => {
  const {
    CEO_EMAIL,
    CEO_PASSWORD,
    CEO_FIRST_NAME,
    CEO_LAST_NAME,
    CEO_USERNAME,
  } = process.env;

  if (!CEO_EMAIL || !CEO_PASSWORD || !CEO_FIRST_NAME || !CEO_LAST_NAME || !CEO_USERNAME) {
    console.warn("⚠️ CEO account env vars missing. Skipping.");
    return;
  }

  const exists = await prisma.user.findUnique({
    where: { email: CEO_EMAIL },
  });
  if (exists) {
    console.log("ℹ️ CEO account already exists, skipping.");
    return;
  }

  const ceoRole = await prisma.role.findFirst({
    where: { name: "Directeur Général (CEO)" },
  });
  if (!ceoRole) {
    console.error("❌ 'Directeur Général (CEO)' role not found. Seed roles first.");
    return;
  }

  const department = await prisma.department.findFirst({
    where: { code: "DG" },
  });
  if (!department) {
    // Fallback to first available department
    const fallbackDept = await prisma.department.findFirst();
    if (!fallbackDept) {
      console.error("❌ No department found. Seed departments first.");
      return;
    }

    const hashedPassword = await argon2.hash(CEO_PASSWORD);
    const [ceoUser] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email: CEO_EMAIL,
          password: hashedPassword,
          name: CEO_FIRST_NAME,
          surname: CEO_LAST_NAME,
          username: CEO_USERNAME,
          phoneNumber: "670000001",
          isEmailVerified: true,
          status: UserStatus.ACTIVE,
          roleId: ceoRole.id,
          nationalIdNumber: "00000001",
          employeeId: "CEO-001",
          isSystem: true,
          passwordChangedAt: new Date(),
          gender: "M",
          hireDate: new Date(),
          departmentId: fallbackDept.id,
        },
      }),
    ]);

    await prisma.$transaction([
      prisma.userPreference.create({
        data: {
          userId: ceoUser.id,
          language: Language.ENG,
          currency: Currency.XAF,
        },
      }),
    ]);

    console.log(`✅ CEO account created: ${ceoUser.email}`);
    return;
  }

  const hashedPassword = await argon2.hash(CEO_PASSWORD);
  const [ceoUser] = await prisma.$transaction([
    prisma.user.create({
      data: {
        email: CEO_EMAIL,
        password: hashedPassword,
        name: CEO_FIRST_NAME,
        surname: CEO_LAST_NAME,
        username: CEO_USERNAME,
        phoneNumber: "670000001",
        isEmailVerified: true,
        status: UserStatus.ACTIVE,
        roleId: ceoRole.id,
        nationalIdNumber: "00000001",
        employeeId: "CEO-001",
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
        userId: ceoUser.id,
        language: Language.ENG,
        currency: Currency.XAF,
      },
    }),
  ]);

  console.log(`✅ CEO account created: ${ceoUser.email}`);
};

const seedAccountantAccount = async (): Promise<void> => {
  const {
    ACCOUNTANT_EMAIL,
    ACCOUNTANT_PASSWORD,
    ACCOUNTANT_FIRST_NAME,
    ACCOUNTANT_LAST_NAME,
    ACCOUNTANT_USERNAME,
  } = process.env;

  if (
    !ACCOUNTANT_EMAIL ||
    !ACCOUNTANT_PASSWORD ||
    !ACCOUNTANT_FIRST_NAME ||
    !ACCOUNTANT_LAST_NAME ||
    !ACCOUNTANT_USERNAME
  ) {
    console.warn("⚠️ Accountant account env vars missing. Skipping.");
    return;
  }

  const exists = await prisma.user.findUnique({
    where: { email: ACCOUNTANT_EMAIL },
  });
  if (exists) {
    console.log("ℹ️ Accountant account already exists, skipping.");
    return;
  }

  const accountantRole = await prisma.role.findFirst({
    where: { name: "Comptable (Accountant)" },
  });
  if (!accountantRole) {
    console.error("❌ 'Comptable (Accountant)' role not found. Seed roles first.");
    return;
  }

  const department = await prisma.department.findFirst({
    where: { code: "ACCT" },
  });
  if (!department) {
    const fallbackDept = await prisma.department.findFirst();
    if (!fallbackDept) {
      console.error("❌ No department found. Seed departments first.");
      return;
    }

    const hashedPassword = await argon2.hash(ACCOUNTANT_PASSWORD);
    const [accountantUser] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email: ACCOUNTANT_EMAIL,
          password: hashedPassword,
          name: ACCOUNTANT_FIRST_NAME,
          surname: ACCOUNTANT_LAST_NAME,
          username: ACCOUNTANT_USERNAME,
          phoneNumber: "670000002",
          isEmailVerified: true,
          status: UserStatus.ACTIVE,
          roleId: accountantRole.id,
          nationalIdNumber: "00000002",
          employeeId: "ACCT-001",
          isSystem: true,
          passwordChangedAt: new Date(),
          gender: "M",
          hireDate: new Date(),
          departmentId: fallbackDept.id,
        },
      }),
    ]);

    await prisma.$transaction([
      prisma.userPreference.create({
        data: {
          userId: accountantUser.id,
          language: Language.ENG,
          currency: Currency.XAF,
        },
      }),
    ]);

    console.log(`✅ Accountant account created: ${accountantUser.email}`);
    return;
  }

  const hashedPassword = await argon2.hash(ACCOUNTANT_PASSWORD);
  const [accountantUser] = await prisma.$transaction([
    prisma.user.create({
      data: {
        email: ACCOUNTANT_EMAIL,
        password: hashedPassword,
        name: ACCOUNTANT_FIRST_NAME,
        surname: ACCOUNTANT_LAST_NAME,
        username: ACCOUNTANT_USERNAME,
        phoneNumber: "670000002",
        isEmailVerified: true,
        status: UserStatus.ACTIVE,
        roleId: accountantRole.id,
        nationalIdNumber: "00000002",
        employeeId: "ACCT-001",
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
        userId: accountantUser.id,
        language: Language.ENG,
        currency: Currency.XAF,
      },
    }),
  ]);

  console.log(`✅ Accountant account created: ${accountantUser.email}`);
};

export default seedTestingAccounts;
