/*
  Warnings:

  - You are about to drop the column `name` on the `permissions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[engName]` on the table `permissions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[frName]` on the table `permissions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `engName` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `frName` to the `permissions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "permissions_name_key";

-- AlterTable
ALTER TABLE "permissions" DROP COLUMN "name",
ADD COLUMN     "engName" TEXT NOT NULL,
ADD COLUMN     "frName" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "permissions_engName_key" ON "permissions"("engName");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_frName_key" ON "permissions"("frName");
