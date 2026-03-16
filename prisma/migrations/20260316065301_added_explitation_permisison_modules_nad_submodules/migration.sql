-- AlterEnum
ALTER TYPE "PermissionModule" ADD VALUE 'APPROVAL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PermissionSubmodule" ADD VALUE 'DEPOTS';
ALTER TYPE "PermissionSubmodule" ADD VALUE 'TANKERS';
ALTER TYPE "PermissionSubmodule" ADD VALUE 'DRIVERS';
ALTER TYPE "PermissionSubmodule" ADD VALUE 'BOTTLE_TYPES';
ALTER TYPE "PermissionSubmodule" ADD VALUE 'BOTTLE_CATEGORIES';
ALTER TYPE "PermissionSubmodule" ADD VALUE 'ACCESSORY_ITEMS';
ALTER TYPE "PermissionSubmodule" ADD VALUE 'EXPLOITATION_DOCUMENTS';
ALTER TYPE "PermissionSubmodule" ADD VALUE 'GAS_PURCHASE_ORDERS';
ALTER TYPE "PermissionSubmodule" ADD VALUE 'EXPLOITATION_APPROVALS';
