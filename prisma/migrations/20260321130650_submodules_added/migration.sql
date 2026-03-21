-- AlterEnum
ALTER TYPE "PermissionSubmodule" ADD VALUE 'PAYMENTS';

-- CreateTable
CREATE TABLE "order_emails" (
    "id" TEXT NOT NULL,
    "ref_table" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "recipient_name" TEXT,
    "supplier_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html_body" TEXT NOT NULL,
    "user_message" TEXT,
    "sent_by_id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "brevo_message_id" TEXT,
    "delivery_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_emails_ref_table_order_id_idx" ON "order_emails"("ref_table", "order_id");

-- CreateIndex
CREATE INDEX "order_emails_sent_by_id_idx" ON "order_emails"("sent_by_id");

-- AddForeignKey
ALTER TABLE "order_emails" ADD CONSTRAINT "order_emails_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_emails" ADD CONSTRAINT "order_emails_sent_by_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
