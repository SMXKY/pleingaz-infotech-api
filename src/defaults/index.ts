import seedDepartments from "./departments.seed";
import seedRoles from "./roles.seed";

const seedDefaultRecords = async () => {
  await seedRoles();
  await seedDepartments();
};
