import prisma from "@models/index.model";
import { permissions } from "src/data/permissions.data";
import { PermissionRiskLevel } from "src/generated/prisma";

const seedPermissions = async (forceUpdate = false) => {
  let created = 0,
    updated = 0,
    skipped = 0;

  for (const seed of permissions) {
    const existing = await prisma.permission.findUnique({
      where: { code: seed.code },
    });

    if (!existing) {
      await prisma.permission.create({
        data: {
          code: seed.code,
          engName: seed.engName,
          frName: seed.frName,
          module: seed.module,
          submodule: seed.submodule,
          action: seed.action,
          isWildcard: seed.isWildcard ?? false,
          riskLevel: seed.riskLevel ?? PermissionRiskLevel.LOW,
          description: seed.description ?? null,
        },
      });
      created++;
      console.log(`✅ Created: ${seed.code}`);
    } else if (forceUpdate) {
      await prisma.permission.update({
        where: { code: seed.code },
        data: {
          engName: seed.engName,
          frName: seed.frName,
          module: seed.module,
          submodule: seed.submodule,
          action: seed.action,
          riskLevel: seed.riskLevel ?? PermissionRiskLevel.LOW,
          description: seed.description ?? null,
        },
      });
      updated++;
      console.log(`🔄 Updated: ${seed.code}`);
    } else {
      skipped++;
    }
  }

  console.log(
    `📊 Permissions — Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`
  );
};

export default seedPermissions;
