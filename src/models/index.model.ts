import { PrismaClient } from "src/generated/prisma";

const prisma = new PrismaClient({
  omit: {
    user: {
      deletedAt: true,
      password: true,
      passwordConfirm: true,
      passwordChangedAt: true,
      failedLoginAttempts: true,
      lockedUntil: true,
    },
    role: { deletedAt: true },
    department: { deletedAt: true },
  },
});
export default prisma;
