import { PrismaClient } from "src/generated/prisma";
import { Prisma } from "src/generated/prisma";

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
    orderEmail: {
      htmlBody: false,
    },
  },
});

async function patchDecimalSerialization() {
  const result = await prisma.$queryRaw`SELECT 1.0::decimal as val`;
  const DecimalProto = Object.getPrototypeOf((result as any)[0].val);
  DecimalProto.toJSON = function () {
    return this.toString();
  };
}

patchDecimalSerialization().catch(console.error);

export default prisma;
