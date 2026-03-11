import { PrismaClient } from "@prisma/client";

export type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

const generateEmployeeId = async (
  tx: TransactionClient,
  prefix: string = "INFOTECH"
): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const fullPrefix = `${prefix}-${year}${month}`;

  const lastEmployee = await tx.user.findFirst({
    where: {
      employeeId: {
        startsWith: fullPrefix,
      },
    },
    orderBy: {
      employeeId: "desc",
    },
    select: {
      employeeId: true,
    },
  });

  let sequence = 1;

  if (lastEmployee) {
    const parts = lastEmployee.employeeId.split("-");
    const lastSequence = parseInt(parts[parts.length - 1], 10);
    sequence = lastSequence + 1;
  }

  return `${fullPrefix}-${sequence.toString().padStart(4, "0")}`;
};

export default generateEmployeeId;
