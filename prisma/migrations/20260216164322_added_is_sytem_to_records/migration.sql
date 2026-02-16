-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "is_system" BOOLEAN;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "is_system" BOOLEAN;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_system" BOOLEAN;
