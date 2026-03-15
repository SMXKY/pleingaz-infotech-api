/*
  Warnings:

  - You are about to drop the column `body` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `notifications` table. All the data in the column will be lost.
  - Added the required column `body_english` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `body_french` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title_english` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title_french` to the `notifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "body",
DROP COLUMN "title",
ADD COLUMN     "body_english" TEXT NOT NULL,
ADD COLUMN     "body_french" TEXT NOT NULL,
ADD COLUMN     "title_english" TEXT NOT NULL,
ADD COLUMN     "title_french" TEXT NOT NULL;
