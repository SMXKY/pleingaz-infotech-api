-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogOperation" ADD VALUE 'FORGOT_PASSWORD';
ALTER TYPE "LogOperation" ADD VALUE 'RESET_PASSWORD';
ALTER TYPE "LogOperation" ADD VALUE 'CHANGE_PASSWORD';
ALTER TYPE "LogOperation" ADD VALUE 'CHANGE_USER_CREDENTIALS';
