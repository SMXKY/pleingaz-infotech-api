-- CreateEnum
CREATE TYPE "PermissionRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "permissions" ADD COLUMN     "risk_level" "PermissionRiskLevel" NOT NULL DEFAULT 'LOW';
