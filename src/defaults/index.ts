import { seedAdminConfig } from "./adminConfig.seed";
import seedDepartments from "./departments.seed";
import { seedFinanceSettings } from "./financeSettings.seed";
import seedImplications from "./permissionImplications.seed";
import seedPermissions from "./permissions.seed";
import seedRoles from "./roles.seed";
import seedSuperAdmin from "./superAdminAccount.seed";
import seedSuperAdminRolePermissions from "./superAdminPermissions.seed";
import seedDepots from "./depots.seed";
import { seedExchangeRates } from "./exchangeRates.seed";
import seedAccessoryCategories from "./accessoryCategories.seed";
import seedBottleTypes from "./bottleTypes.seed";

export const seedDefaultRecords = async () => {
  await seedRoles();
  await seedDepartments();
  await seedPermissions();
  await seedImplications();
  await seedSuperAdmin();
  await seedSuperAdminRolePermissions();
  await seedAdminConfig();
  await seedFinanceSettings();
  await seedExchangeRates();
  await seedDepots();
  await seedAccessoryCategories();
  await seedBottleTypes();
};
