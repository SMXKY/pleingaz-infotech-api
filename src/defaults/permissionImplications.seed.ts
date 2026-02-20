import prisma from "@models/index.model";
import { implicationSeeds } from "src/data/permissionImplications.data";

const seedImplications = async () => {
  let created = 0,
    skipped = 0;

  for (const seed of implicationSeeds) {
    const permission = await prisma.permission.findUnique({
      where: { code: seed.permission },
    });

    if (!permission) {
      console.warn(`⚠️ Permission not found: ${seed.permission}`);
      continue;
    }

    for (const impliedCode of seed.implies) {
      const impliedPermission = await prisma.permission.findUnique({
        where: { code: impliedCode },
      });

      if (!impliedPermission) {
        console.warn(`⚠️ Implied permission not found: ${impliedCode}`);
        continue;
      }

      const exists = await prisma.permissionImplies.findUnique({
        where: {
          permissionId_impliedPermissionId: {
            permissionId: permission.id,
            impliedPermissionId: impliedPermission.id,
          },
        },
      });

      if (!exists) {
        await prisma.permissionImplies.create({
          data: {
            permissionId: permission.id,
            impliedPermissionId: impliedPermission.id,
          },
        });
        created++;
        console.log(`✅ ${seed.permission} → implies → ${impliedCode}`);
      } else {
        skipped++;
      }
    }
  }

  console.log(`📊 Implications — Created: ${created}, Skipped: ${skipped}`);
};

export default seedImplications;
