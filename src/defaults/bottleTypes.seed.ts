import { prisma } from "src";
import { GasBottleSize, GasBottleCategory } from "src/generated/prisma";

const defaultBottleTypes = [
  {
    code: "BT-230G",
    name: "Bouteille 230g",
    capacityGrams: 230,
    capacityKg: 0.23,
    size: GasBottleSize.G230,
    category: GasBottleCategory.SMALL,
    description: "Bouteille GPL de 230 grammes",
    accessoryCategoryCode: "ACC-CAT-SMALL-CAPS",
    isActive: true,
  },
  {
    code: "BT-450G",
    name: "Bouteille 450g",
    capacityGrams: 450,
    capacityKg: 0.45,
    size: GasBottleSize.G450,
    category: GasBottleCategory.SMALL,
    description: "Bouteille GPL de 450 grammes",
    accessoryCategoryCode: "ACC-CAT-SMALL-CAPS",
    isActive: true,
  },
  {
    code: "BT-6KG",
    name: "Bouteille 6kg",
    capacityGrams: 6000,
    capacityKg: 6.0,
    size: GasBottleSize.KG6,
    category: GasBottleCategory.MEDIUM,
    description: "Bouteille GPL de 6 kilogrammes",
    accessoryCategoryCode: "ACC-CAT-LARGE-CAPS",
    isActive: true,
  },
  {
    code: "BT-12.5KG",
    name: "Bouteille 12.5kg",
    capacityGrams: 12500,
    capacityKg: 12.5,
    size: GasBottleSize.KG12_5,
    category: GasBottleCategory.LARGE,
    description: "Bouteille GPL de 12.5 kilogrammes",
    accessoryCategoryCode: "ACC-CAT-LARGE-CAPS",
    isActive: true,
  },
  {
    code: "BT-50KG",
    name: "Bouteille 50kg",
    capacityGrams: 50000,
    capacityKg: 50.0,
    size: GasBottleSize.KG50,
    category: GasBottleCategory.LARGE,
    description: "Bouteille GPL de 50 kilogrammes",
    accessoryCategoryCode: "ACC-CAT-LARGE-CAPS",
    isActive: true,
  },
];

const seedBottleTypes = async () => {
  console.log("🌱 Seeding Bottle Types...");

  let created = 0;
  let skipped = 0;

  await prisma.$transaction(async (tx) => {
    for (const bottleType of defaultBottleTypes) {
      const exists = await tx.gasBottleType.findUnique({
        where: { code: bottleType.code },
      });

      if (exists) {
        skipped++;
        continue;
      }

      const accessoryCategory = await tx.accessoryCategory.findUnique({
        where: { code: bottleType.accessoryCategoryCode },
      });

      if (!accessoryCategory) {
        console.warn(
          `⚠️ Accessory category ${bottleType.accessoryCategoryCode} not found for bottle type ${bottleType.code}, skipping...`
        );
        skipped++;
        continue;
      }

      const { accessoryCategoryCode, ...data } = bottleType;

      await tx.gasBottleType.create({
        data: {
          ...data,
          accessoryCategoryId: accessoryCategory.id,
        },
      });
      created++;
    }
  });

  console.log(
    `✅ Bottle Types seeded: ${created} created, ${skipped} skipped`
  );
};

export default seedBottleTypes;
