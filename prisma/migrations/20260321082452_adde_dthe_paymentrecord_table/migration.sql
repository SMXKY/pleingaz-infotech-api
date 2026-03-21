-- CreateEnum
CREATE TYPE "PaymentRecipientType" AS ENUM ('SUPPLIER', 'EMPLOYEE', 'DRIVER', 'OTHER');

-- CreateTable
CREATE TABLE "payment_records" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "ref_table" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "paid_by_id" TEXT NOT NULL,
    "recipient_type" "PaymentRecipientType" NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "recipient_user_id" TEXT,
    "recipient_supplier_id" TEXT,
    "method" "PaymentMethod" NOT NULL,
    "mobile_money_provider" "MobileMoneyProvider",
    "bank_name" TEXT,
    "transaction_reference" TEXT,
    "check_number" TEXT,
    "currency" "Currency" NOT NULL DEFAULT 'XAF',
    "amount" DECIMAL(15,2) NOT NULL,
    "amount_in_cfa" DECIMAL(15,2) NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_reversal" BOOLEAN NOT NULL DEFAULT false,
    "reverses_id" TEXT,
    "purpose" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_records_reverses_id_key" ON "payment_records"("reverses_id");

-- CreateIndex
CREATE INDEX "payment_records_invoice_id_idx" ON "payment_records"("invoice_id");

-- CreateIndex
CREATE INDEX "payment_records_ref_table_order_id_idx" ON "payment_records"("ref_table", "order_id");

-- CreateIndex
CREATE INDEX "payment_records_paid_by_id_idx" ON "payment_records"("paid_by_id");

-- CreateIndex
CREATE INDEX "payment_records_paid_at_idx" ON "payment_records"("paid_at");

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "exploitation_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_paid_by_id_fkey" FOREIGN KEY ("paid_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_recipient_supplier_id_fkey" FOREIGN KEY ("recipient_supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_reverses_id_fkey" FOREIGN KEY ("reverses_id") REFERENCES "payment_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
