import { SequenceType, Prisma } from "src/generated/prisma";
import { TransactionClient } from "src/modules/users/utilites/generateEmployeeId.util";

type SequenceResult = {
  current_number: number;
  prefix: string;
  current_year: number;
};

const generateOrderReference = async (
  tx: TransactionClient,
  type: SequenceType
): Promise<string> => {
  const currentYear = new Date().getFullYear();

  const sequence = (await tx.$queryRaw(
    Prisma.sql`
      SELECT current_number, prefix, current_year
      FROM number_sequences 
      WHERE type = ${type}::"SequenceType"
      FOR UPDATE
    `
  )) as SequenceResult[];

  const record = sequence[0];

  const newNumber =
    record.current_year === currentYear ? record.current_number + 1 : 1;

  await tx.numberSequence.update({
    where: { type },
    data: {
      currentNumber: newNumber,
      currentYear,
    },
  });

  return `${record.prefix}-${currentYear}-${newNumber
    .toString()
    .padStart(3, "0")}`;
};

export default generateOrderReference;
