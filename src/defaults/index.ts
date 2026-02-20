import { seedAdminConfig } from "./adminConfig.seed";
import seedDepartments from "./departments.seed";
import seedImplications from "./permissionImplications.seed";
import seedPermissions from "./permissions.seed";
import seedRoles from "./roles.seed";
import seedSuperAdmin from "./superAdminAccount.seed";
import seedSuperAdminRolePermissions from "./superAdminPermissions.seed";

export const seedDefaultRecords = async () => {
  await seedRoles();
  await seedDepartments();
  await seedPermissions();
  await seedImplications();
  await seedSuperAdmin();
  await seedSuperAdminRolePermissions();
  await seedAdminConfig();
};
