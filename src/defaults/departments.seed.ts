import { prisma } from "src";

const defaultDepartments = [
  {
    name: "Executive",
    code: "CEO",
    isSystem: true,
  },
  {
    name: "Exploitation & Procurement",
    code: "EXPLOITATION",
    isSystem: true,
  },
  {
    name: "Logistics",
    code: "LOGISTICS",
    isSystem: true,
  },
  {
    name: "Sales & Commercial",
    code: "SALES",
    isSystem: true,
  },
  {
    name: "Filling & Production",
    code: "FILLING",
    isSystem: true,
  },
  {
    name: "Accounting & Finance",
    code: "ACCOUNTING",
    isSystem: true,
  },
  {
    name: "Human Resources",
    code: "HR",
    isSystem: true,
  },
  {
    name: "Legal",
    code: "LEGAL",
    isSystem: true,
  },
  {
    name: "Maintenance & Technical",
    code: "MAINTENANCE",
    isSystem: true,
  },
  {
    name: "Research & Development",
    code: "RND",
    isSystem: true,
  },
  {
    name: "Information Technology",
    code: "IT",
    isSystem: true,
  },
];

const seedDepartments = async () => {
  console.log("🌱 Seeding departments...");

  let created = 0;
  let skipped = 0;

  await prisma.$transaction(async (tx) => {
    for (const department of defaultDepartments) {
      const exists = await tx.department.findUnique({
        where: { code: department.code },
      });

      if (exists) {
        skipped++;
        continue;
      }

      await tx.department.create({ data: department });
      created++;
    }
  });

  console.log(`✅ Departments seeded: ${created} created, ${skipped} skipped`);
};

export default seedDepartments;
