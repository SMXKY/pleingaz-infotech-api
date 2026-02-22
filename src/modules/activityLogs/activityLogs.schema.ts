import { z } from "zod";

export const LogOperationEnum = z.enum(["CREATE", "READ", "UPDATE", "DELETE"]);

export const LogCategoryEnum = z.enum(["READ", "WRITE", "SENSITIVE_READ"]);

export const LogStatusEnum = z.enum(["SUCCESS", "FAILED"]);

export const createActivityLogSchema = z.object({
  userId: z.string().uuid().optional(),
  userEmail: z.string().email().optional(),
  operation: LogOperationEnum,
  category: LogCategoryEnum,
  tableName: z.string().min(1, "error.validation.table_name_required"),
  recordId: z.string().min(1, "error.validation.record_id_required"),
  previousState: z.record(z.any(), z.any()).nullable().optional(),
  newState: z.record(z.any(), z.any()).nullable().optional(),
  changedFields: z.array(z.string()).default([]),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  requestId: z.string().optional(),
  metadata: z.record(z.any(), z.any()).optional(),
  status: LogStatusEnum.default("SUCCESS"),
  failureReason: z.string().optional(),
});

export const activityLogFilterSchema = z
  .object({
    userId: z.string().uuid().optional(),
    userEmail: z.string().email().optional(),
    operation: LogOperationEnum.optional(),
    category: LogCategoryEnum.optional(),
    tableName: z.string().optional(),
    recordId: z.string().optional(),
    status: LogStatusEnum.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (data.from && data.to) return data.from <= data.to;
      return true;
    },
    { message: "error.validation.date_range_invalid", path: ["from"] }
  );

export type CreateActivityLogInput = z.infer<typeof createActivityLogSchema>;
export type ActivityLogFilter = z.infer<typeof activityLogFilterSchema>;
export type LogOperation = z.infer<typeof LogOperationEnum>;
export type LogCategory = z.infer<typeof LogCategoryEnum>;
export type LogStatus = z.infer<typeof LogStatusEnum>;
