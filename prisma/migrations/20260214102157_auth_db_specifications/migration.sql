-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('FR', 'ENG');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('FCFA', 'EUR', 'USD');

-- CreateEnum
CREATE TYPE "PermissionModule" AS ENUM ('EXPLOITATION', 'LOGISTICS', 'SALES', 'FILLING_PRODUCTION', 'ACCOUNTING', 'HUMAN_RESOURCES', 'LEGAL', 'MAINTENANCE_TECHNICAL', 'RESEARCH_DEVELOPMENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "PermissionSubmodule" AS ENUM ('GAS_ORDERS', 'SUPPLIER_MANAGEMENT', 'SAFETY_CAPS_JOINTS', 'VEHICLE_INSPECTION', 'FUEL_MANAGEMENT', 'DRIVER_DOCUMENTS', 'TRANSPORT_RECEIPTS', 'POCKET_ALLOWANCE', 'TRANSACTIONS', 'WAREHOUSE_STOCK', 'DISCOUNTS', 'CASH_RECONCILIATION', 'AGENCIES', 'TANK_MANAGEMENT', 'BOTTLE_TRACKING', 'PRODUCTION_RECORDS', 'STOCK_RECONCILIATION', 'SUPPLIER_INVOICES', 'CUSTOMER_INVOICES', 'CASH_BANK', 'PAYROLL', 'FIXED_ASSETS', 'TAX_DECLARATIONS', 'FINANCIAL_REPORTS', 'ATTENDANCE', 'RECRUITMENT', 'SALARY_MANAGEMENT', 'LEAVE_PERMISSION', 'MISSIONS', 'MAIL_MANAGEMENT', 'INSURANCE', 'ACCIDENTS', 'DEBT_RECOVERY', 'CONTRACTS', 'COMPLAINTS', 'CONVOCATIONS', 'FAULT_DECLARATION', 'MAINTENANCE_WORKFLOW', 'TECHNICIAN_ASSIGNMENT', 'SPARE_PARTS', 'MAINTENANCE_REPORTS', 'PROJECTS', 'PROJECT_MONITORING', 'INVESTMENT_ANALYSIS', 'USERS', 'ROLES', 'PERMISSIONS', 'SYSTEM_CONFIG', 'AUDIT_LOGS');

-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EXPORT', 'IMPORT');

-- CreateEnum
CREATE TYPE "LogOperation" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "LogCategory" AS ENUM ('WRITE', 'READ', 'SENSITIVE_READ');

-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('FAILED', 'SUCCESS');

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_overrides" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_granted" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "role_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "module" "PermissionModule" NOT NULL,
    "submodule" "PermissionSubmodule" NOT NULL,
    "action" "PermissionAction" NOT NULL,
    "is_wildcard" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_implies" (
    "id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "implied_permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "permission_implies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_overrides" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "is_granted" BOOLEAN NOT NULL DEFAULT true,
    "is_temporary" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "national_id_number" TEXT NOT NULL,
    "phone_number" TEXT,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "password" TEXT NOT NULL,
    "password_confirm" TEXT,
    "password_changed_at" TIMESTAMP(3),
    "deactivated_until" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_logged_in_at" TIMESTAMP(3),
    "dob" TIMESTAMP(3),
    "gender" "Gender" NOT NULL DEFAULT 'M',
    "profile_picture_url" TEXT,
    "address" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone_number" TEXT,
    "hire_date" TIMESTAMP(3) NOT NULL,
    "base_salary_in_cfa" INTEGER,
    "bank_name" TEXT,
    "cnps_number" TEXT,
    "tax_id" TEXT,
    "department_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "language" "Language" NOT NULL DEFAULT 'FR',
    "currency" "Currency" NOT NULL DEFAULT 'FCFA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_email" TEXT NOT NULL,
    "operation" "LogOperation" NOT NULL,
    "category" "LogCategory" NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "previous_state" JSONB,
    "new_state" JSONB,
    "changed_fields" TEXT[],
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_id" TEXT,
    "metadata" JSONB,
    "status" "LogStatus" NOT NULL,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE INDEX "departments_deleted_at_idx" ON "departments"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "roles_deleted_at_idx" ON "roles"("deleted_at");

-- CreateIndex
CREATE INDEX "role_overrides_deleted_at_idx" ON "role_overrides"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "role_overrides_user_id_role_id_key" ON "role_overrides"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_deleted_at_idx" ON "permissions"("deleted_at");

-- CreateIndex
CREATE INDEX "permission_implies_deleted_at_idx" ON "permission_implies"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "permission_implies_permission_id_implied_permission_id_key" ON "permission_implies"("permission_id", "implied_permission_id");

-- CreateIndex
CREATE INDEX "permission_overrides_deleted_at_idx" ON "permission_overrides"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "permission_overrides_user_id_permission_id_key" ON "permission_overrides"("user_id", "permission_id");

-- CreateIndex
CREATE INDEX "role_permissions_deleted_at_idx" ON "role_permissions"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_national_id_number_key" ON "users"("national_id_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "activity_logs_table_name_idx" ON "activity_logs"("table_name");

-- CreateIndex
CREATE INDEX "activity_logs_operation_idx" ON "activity_logs"("operation");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- AddForeignKey
ALTER TABLE "role_overrides" ADD CONSTRAINT "role_overrides_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_overrides" ADD CONSTRAINT "role_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_overrides" ADD CONSTRAINT "role_overrides_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_implies" ADD CONSTRAINT "permission_implies_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_implies" ADD CONSTRAINT "permission_implies_implied_permission_id_fkey" FOREIGN KEY ("implied_permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_overrides" ADD CONSTRAINT "permission_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_overrides" ADD CONSTRAINT "permission_overrides_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_overrides" ADD CONSTRAINT "permission_overrides_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
