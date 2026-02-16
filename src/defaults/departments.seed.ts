import { prisma } from "src";

const defaultDepartments = [
  {
    name: "Executive",
    code: "CEO",
  },
  {
    name: "Exploitation & Procurement",
    code: "EXPLOITATION",
  },
  {
    name: "Logistics",
    code: "LOGISTICS",
  },
  {
    name: "Sales & Commercial",
    code: "SALES",
  },
  {
    name: "Filling & Production",
    code: "FILLING",
  },
  {
    name: "Accounting & Finance",
    code: "ACCOUNTING",
    isSystem: true,
  },
  {
    name: "Human Resources",
    code: "HR",
  },
  {
    name: "Legal",
    code: "LEGAL",
  },
  {
    name: "Maintenance & Technical",
    code: "MAINTENANCE",
  },
  {
    name: "Research & Development",
    code: "RND",
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
