import prisma from "@models/index.model";
import { SUPER_ADMIN_EMAIL } from "@utils/enviromentVariablesCheck.util";

const seedSuperAdminRolePermissions = async () => {
  const superAdmin = await prisma.role.findFirst({
    where: { name: "Administrateur Système (System Admin)" },
  });

  if (!superAdmin) {
    console.warn("❌ Super admin role not found, skipping role permissions");
    return;
  }

  const systemUser = await prisma.user.findFirst({
    where: { email: SUPER_ADMIN_EMAIL },
  });

  if (!systemUser) {
    console.warn("❌ System user not found, skipping role permissions");
    return;
  }

  const allPermissions = await prisma.permission.findMany({
    where: { deletedAt: null },
  });

  const existingRolePermissions = await prisma.rolePermission.findMany({
    where: { roleId: superAdmin.id, deletedAt: null },
    select: { permissionId: true },
  });

  const existingPermissionIds = new Set(
    existingRolePermissions.map((rp) => rp.permissionId)
  );

  const permissionsToAdd = allPermissions.filter(
    (p) => !existingPermissionIds.has(p.id)
  );

  if (permissionsToAdd.length === 0) {
    console.log("ℹ️ All permissions already mapped to super admin role.");
    return;
  }

  await prisma.rolePermission.createMany({
    data: permissionsToAdd.map((p) => ({
      roleId: superAdmin.id,
      permissionId: p.id,
      createdById: systemUser.id,
    })),
    skipDuplicates: true,
  });

  console.log(
    `✅ Added ${permissionsToAdd.length} permissions to super admin role.`
  );
};

export default seedSuperAdminRolePermissions;
