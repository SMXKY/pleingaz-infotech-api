import { prisma } from "src";

const defaultRoles = [
  {
    name: "CEO",
    description:
      "Chief Executive Officer - Final approvals and full system access",
    isSystem: true,
  },
  {
    name: "Chief of Exploitation",
    description:
      "Head of Exploitation Department - Gas purchasing and procurement management",
    isSystem: true,
  },
  {
    name: "Logistics Manager",
    description: "Head of Logistics - Vehicle management and transportation",
    isSystem: true,
  },
  {
    name: "Logistics Officer",
    description: "Logistics staff - Vehicle inspection and delivery",
    isSystem: true,
  },
  {
    name: "Sales Manager",
    description: "Head of Sales - Commercial operations management",
    isSystem: true,
  },
  {
    name: "Sales Personnel",
    description: "Sales staff - Retail and wholesale operations",
    isSystem: true,
  },
  {
    name: "Cashier",
    description: "Handles cash transactions and daily reconciliation",
    isSystem: true,
  },
  {
    name: "Sub-Cashier",
    description: "Warehouse-level cashier - Reports to main cashier",
    isSystem: true,
  },
  {
    name: "Filling Supervisor",
    description: "Supervises gas filling and production operations",
    isSystem: true,
  },
  {
    name: "Filling Operator",
    description: "Operates filling equipment and tracks bottles",
    isSystem: true,
  },
  {
    name: "Accountant",
    description: "Financial management, invoicing, payroll, and compliance",
    isSystem: true,
  },
  {
    name: "HR Manager",
    description: "Head of Human Resources - Employee management",
    isSystem: true,
  },
  {
    name: "HR Officer",
    description: "HR staff - Attendance, recruitment, permissions",
    isSystem: true,
  },
  {
    name: "Legal Officer",
    description: "Legal affairs, insurance, mail management, contracts",
    isSystem: true,
  },
  {
    name: "Maintenance Manager",
    description: "Head of Maintenance - Equipment and technical oversight",
    isSystem: true,
  },
  {
    name: "Technician",
    description: "Technical staff - Repairs and maintenance execution",
    isSystem: true,
  },
  {
    name: "R&D Officer",
    description: "Research and Development - Project creation and monitoring",
    isSystem: true,
  },
  {
    name: "System Admin",
    description: "System administration - User management and configuration",
    isSystem: true,
  },
];

const seedRoles = async () => {
  console.log("🌱 Seeding roles...");

  let created = 0;
  let skipped = 0;

  await prisma.$transaction(async (tx) => {
    for (const role of defaultRoles) {
      const exists = await tx.role.findUnique({
        where: { name: role.name },
      });

      if (exists) {
        skipped++;
        continue;
      }

      await tx.role.create({ data: role });
      created++;
    }
  });

  console.log(`✅ Roles seeded: ${created} created, ${skipped} skipped`);
};

export default seedRoles;
