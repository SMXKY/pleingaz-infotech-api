import { SequenceType, Prisma } from "src/generated/prisma";
import { TransactionClient } from "src/modules/users/utilities/generateEmployeeId.util";

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
    GAS_PO: "GAS_PO",
    GAS_BOTTLE_PO: "GAS_BOTTLE_PO",
    ACCESSORY_PO: "ACCESSORY_PO",
    GAS_INVOICE: "GAS_INVOICE",
    GAS_BOTTLE_INVOICE: "GAS_BOTTLE_INVOICE",
    ACCESSORY_INVOICE: "ACCESSORY_INVOICE",
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
        prefix: SequenceType[type],
        currentNumber: 0,
        currentYear: currentYear,
      },
    });

    record = {
      current_number: 0,
      prefix: SequenceType[type],
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
