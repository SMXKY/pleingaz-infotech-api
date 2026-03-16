import { prisma } from "src";
import { GasBottleSize } from "src/generated/prisma";

const defaultAccessoryCategories = [
  {
    code: "ACC-CAT-LARGE-CAPS",
    name: "Large Caps",
    description:
      "Chapeaux pour bouteilles de grande taille (6kg, 12.5kg, 50kg)",
    compatibleBottleSizes: [
      GasBottleSize.KG6,
      GasBottleSize.KG12_5,
      GasBottleSize.KG50,
    ],
    isActive: true,
  },
  {
    code: "ACC-CAT-SMALL-CAPS",
    name: "Small Caps",
    description: "Chapeaux pour bouteilles de petite taille (230g, 450g)",
    compatibleBottleSizes: [GasBottleSize.G230, GasBottleSize.G450],
    isActive: true,
  },
  {
    code: "ACC-CAT-JOINTS",
    name: "Joints",
    description: "Joints d'étanchéité pour toutes tailles de bouteilles",
    compatibleBottleSizes: [
      GasBottleSize.G230,
      GasBottleSize.G450,
      GasBottleSize.KG6,
      GasBottleSize.KG12_5,
      GasBottleSize.KG50,
    ],
    isActive: true,
  },
];

const seedAccessoryCategories = async () => {
  console.log("🌱 Seeding Accessory Categories...");

  let created = 0;
  let skipped = 0;

  await prisma.$transaction(async (tx) => {
    for (const category of defaultAccessoryCategories) {
      const exists = await tx.accessoryCategory.findUnique({
        where: { code: category.code },
      });

      if (exists) {
        skipped++;
        continue;
      }

      await tx.accessoryCategory.create({ data: category });
      created++;
    }
  });

  console.log(
    `✅ Accessory Categories seeded: ${created} created, ${skipped} skipped`
  );
};

export default seedAccessoryCategories;
