import prisma from "@models/index.model";

const generateEmployeeId = async (): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const prefix = `INFOTECH-${year}`;

  const lastEmployee = await prisma.user.findFirst({
    where: {
      employeeId: {
        startsWith: prefix,
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
    const lastSequence = parseInt(lastEmployee.employeeId.split("-")[2], 10);
    sequence = lastSequence + 1;
  }

  return `${prefix}-${sequence.toString().padStart(4, "0")}`;
};

export default generateEmployeeId;
