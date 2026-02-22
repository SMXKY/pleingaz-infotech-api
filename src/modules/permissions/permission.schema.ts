import { z } from "zod";

export const PermissionModuleEnum = z.enum([
  "EXPLOITATION",
  "LOGISTICS",
  "SALES",
  "FILLING_PRODUCTION",
  "ACCOUNTING",
  "HUMAN_RESOURCES",
  "LEGAL",
  "MAINTENANCE_TECHNICAL",
  "RESEARCH_DEVELOPMENT",
  "ADMIN",
  "USER_MANAGEMENT",
]);

export const PermissionSubmoduleEnum = z.enum([
  // EXPLOITATION
  "GAS_ORDERS",
  "SUPPLIER_MANAGEMENT",
  "SAFETY_CAPS_JOINTS",
  // LOGISTICS
  "VEHICLE_INSPECTION",
  "FUEL_MANAGEMENT",
  "DRIVER_DOCUMENTS",
  "TRANSPORT_RECEIPTS",
  "POCKET_ALLOWANCE",
  // SALES
  "TRANSACTIONS",
  "WAREHOUSE_STOCK",
  "DISCOUNTS",
  "CASH_RECONCILIATION",
  "AGENCIES",
  // FILLING_PRODUCTION
  "TANK_MANAGEMENT",
  "BOTTLE_TRACKING",
  "PRODUCTION_RECORDS",
  "STOCK_RECONCILIATION",
  // ACCOUNTING
  "SUPPLIER_INVOICES",
  "CUSTOMER_INVOICES",
  "CASH_BANK",
  "PAYROLL",
  "FIXED_ASSETS",
  "TAX_DECLARATIONS",
  "FINANCIAL_REPORTS",
  // HUMAN_RESOURCES
  "ATTENDANCE",
  "RECRUITMENT",
  "SALARY_MANAGEMENT",
  "LEAVE_PERMISSION",
  "MISSIONS",
  // LEGAL
  "MAIL_MANAGEMENT",
  "INSURANCE",
  "ACCIDENTS",
  "DEBT_RECOVERY",
  "CONTRACTS",
  "COMPLAINTS",
  "CONVOCATIONS",
  // MAINTENANCE_TECHNICAL
  "FAULT_DECLARATION",
  "MAINTENANCE_WORKFLOW",
  "TECHNICIAN_ASSIGNMENT",
  "SPARE_PARTS",
  "MAINTENANCE_REPORTS",
  // RESEARCH_DEVELOPMENT
  "PROJECTS",
  "PROJECT_MONITORING",
  "INVESTMENT_ANALYSIS",
  // ADMIN
  "USERS",
  "ROLES",
  "PERMISSIONS",
  "SYSTEM_CONFIG",
  "AUDIT_LOGS",
]);

export const PermissionActionEnum = z.enum([
  "CREATE",
  "READ",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "REJECT",
  "EXPORT",
  "IMPORT",
]);

export const PermissionRiskLevelEnum = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const createPermissionSchema = z.object({
  engName: z.string().min(1, "error.validation.eng_name_required"),
  frName: z.string().min(1, "error.validation.fr_name_required"),
  code: z.string().min(1, "error.validation.code_required"),
  description: z.string().optional(),
  module: PermissionModuleEnum,
  submodule: PermissionSubmoduleEnum,
  action: PermissionActionEnum,
  isWildcard: z.boolean().optional().default(false),
  riskLevel: PermissionRiskLevelEnum.optional().default("LOW"),
});

export const updatePermissionSchema = z.object({
  engName: z.string().min(1).optional(),
  frName: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional(),
  module: PermissionModuleEnum.optional(),
  submodule: PermissionSubmoduleEnum.optional(),
  action: PermissionActionEnum.optional(),
  isWildcard: z.boolean().optional(),
  riskLevel: PermissionRiskLevelEnum.optional(),
});

export const permissionOverideSchema = z.object({
  permissionId: z.string().uuid("error.validation.invalid_role_id"),
  userId: z.string().uuid("error.validation.invalid_user_id"),
  reason: z
    .string()
    .min(10, "error.validation.role_override_message")
    .max(255, "error.validation.role_override_message"),
  expiresAt: z.coerce
    .date()
    .refine((d) => !d || !isNaN(d.getTime()), {
      message: "error.validation.invalid_dob",
    })
    .optional(),
});

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>;

export type PermissionModule = z.infer<typeof PermissionModuleEnum>;
export type PermissionSubmodule = z.infer<typeof PermissionSubmoduleEnum>;
export type PermissionAction = z.infer<typeof PermissionActionEnum>;
export type PermissionRiskLevel = z.infer<typeof PermissionRiskLevelEnum>;
export type PermissionOverideInput = z.infer<typeof permissionOverideSchema>;
