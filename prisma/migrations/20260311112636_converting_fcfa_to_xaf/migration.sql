/*
  Warnings:

  - The values [FCFA] on the enum `Currency` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Currency_new" AS ENUM ('XAF', 'EUR', 'USD');
ALTER TABLE "public"."accessory_items" ALTER COLUMN "default_currency" DROP DEFAULT;
ALTER TABLE "public"."accessory_purchase_orders" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "public"."exploitation_invoices" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "public"."gas_bottle_purchase_orders" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "public"."gas_purchase_orders" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "public"."user_preferences" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "user_preferences" ALTER COLUMN "currency" TYPE "Currency_new" USING ("currency"::text::"Currency_new");
ALTER TABLE "supplier_payment_methods" ALTER COLUMN "currency" TYPE "Currency_new" USING ("currency"::text::"Currency_new");
ALTER TABLE "supplier_commercial_terms" ALTER COLUMN "default_currency" TYPE "Currency_new" USING ("default_currency"::text::"Currency_new");
ALTER TABLE "gas_purchase_orders" ALTER COLUMN "currency" TYPE "Currency_new" USING ("currency"::text::"Currency_new");
ALTER TABLE "gas_bottle_purchase_orders" ALTER COLUMN "currency" TYPE "Currency_new" USING ("currency"::text::"Currency_new");
ALTER TABLE "accessory_items" ALTER COLUMN "default_currency" TYPE "Currency_new" USING ("default_currency"::text::"Currency_new");
ALTER TABLE "accessory_purchase_orders" ALTER COLUMN "currency" TYPE "Currency_new" USING ("currency"::text::"Currency_new");
ALTER TABLE "exploitation_invoices" ALTER COLUMN "currency" TYPE "Currency_new" USING ("currency"::text::"Currency_new");
ALTER TABLE "exchange_rates" ALTER COLUMN "from_currency" TYPE "Currency_new" USING ("from_currency"::text::"Currency_new");
ALTER TABLE "exchange_rates" ALTER COLUMN "to_currency" TYPE "Currency_new" USING ("to_currency"::text::"Currency_new");
ALTER TYPE "Currency" RENAME TO "Currency_old";
ALTER TYPE "Currency_new" RENAME TO "Currency";
DROP TYPE "public"."Currency_old";
ALTER TABLE "accessory_items" ALTER COLUMN "default_currency" SET DEFAULT 'XAF';
ALTER TABLE "accessory_purchase_orders" ALTER COLUMN "currency" SET DEFAULT 'XAF';
ALTER TABLE "exploitation_invoices" ALTER COLUMN "currency" SET DEFAULT 'XAF';
ALTER TABLE "gas_bottle_purchase_orders" ALTER COLUMN "currency" SET DEFAULT 'XAF';
ALTER TABLE "gas_purchase_orders" ALTER COLUMN "currency" SET DEFAULT 'XAF';
ALTER TABLE "user_preferences" ALTER COLUMN "currency" SET DEFAULT 'XAF';
COMMIT;

-- AlterTable
ALTER TABLE "accessory_items" ALTER COLUMN "default_currency" SET DEFAULT 'XAF';

-- AlterTable
ALTER TABLE "accessory_purchase_orders" ALTER COLUMN "currency" SET DEFAULT 'XAF';

-- AlterTable
ALTER TABLE "exploitation_invoices" ALTER COLUMN "currency" SET DEFAULT 'XAF';

-- AlterTable
ALTER TABLE "gas_bottle_purchase_orders" ALTER COLUMN "currency" SET DEFAULT 'XAF';

-- AlterTable
ALTER TABLE "gas_purchase_orders" ALTER COLUMN "currency" SET DEFAULT 'XAF';

-- AlterTable
ALTER TABLE "user_preferences" ALTER COLUMN "currency" SET DEFAULT 'XAF';
