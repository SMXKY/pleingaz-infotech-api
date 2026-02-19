-- CreateEnum
CREATE TYPE "ConfigType" AS ENUM ('MAIN');

-- CreateTable
CREATE TABLE "admin_config" (
    "id" "ConfigType" NOT NULL DEFAULT 'MAIN',
    "company_email" TEXT NOT NULL,
    "support_email" TEXT NOT NULL,
    "company_phone_number" TEXT NOT NULL,
    "company_prefix" TEXT NOT NULL DEFAULT 'INF',
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_tokens_expires_at_idx" ON "user_tokens"("expires_at");
