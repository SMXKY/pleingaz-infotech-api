import { SequenceType, Prisma } from "src/generated/prisma";
import { TransactionClient } from "src/modules/users/utilites/generateEmployeeId.util";

type SequenceResult = {
  current_number: number;
  prefix: string;
  current_year: number;
};

const generateReference = async (
  tx: TransactionClient,
  type: SequenceType
): Promise<string> => {
  const currentYear = new Date().getFullYear();

  const DEFAULT_PREFIXES: Record<SequenceType, string> = {
    GAS_PO: "GAS-PO",
    GAS_BOTTLE_PO: "GBT-PO",
    ACCESSORY_PO: "ACC-PO",
    GAS_INVOICE: "GAS-INV",
    GAS_BOTTLE_INVOICE: "GBT-INV",
    ACCESSORY_INVOICE: "ACC-INV",
  };

  const sequence = (await tx.$queryRaw(
    Prisma.sql`
      SELECT current_number, prefix, current_year
      FROM number_sequences 
      WHERE type = ${type}::"SequenceType"
      FOR UPDATE
    `
  )) as SequenceResult[];

  let record = sequence[0];

  if (!record) {
    await tx.numberSequence.create({
      data: {
        type,
        prefix: DEFAULT_PREFIXES[type],
        currentNumber: 0,
        currentYear: currentYear,
      },
    });

    record = {
      current_number: 0,
      prefix: DEFAULT_PREFIXES[type],
      current_year: currentYear,
    };
  }

  const newNumber =
    record.current_year === currentYear ? record.current_number + 1 : 1;

  await tx.numberSequence.update({
    where: { type },
    data: {
      currentNumber: newNumber,
      currentYear: currentYear,
    },
  });

  return `${record.prefix}-${currentYear}-${newNumber
    .toString()
    .padStart(3, "0")}`;
};

export default generateReference;
