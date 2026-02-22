import { z } from "zod";

export const createPermissionOverrideSchema = z.object({
  userId: z.string().uuid("error.validation.invalid_user_id"),
  permissionId: z.string().uuid("error.validation.invalid_permission_id"),
  createdById: z.string().uuid("error.validation.invalid_user_id"),
  isGranted: z.boolean().default(true),
  isTemporary: z.boolean().default(false),
  expiresAt: z.coerce
    .date()
    .optional()
    .refine((d) => !d || !isNaN(d.getTime()), {
      message: "error.validation.invalid_dob",
    }),
  reason: z
    .string()
    .min(10, "error.validation.permission_override_message")
    .max(255, "error.validation.permission_override_message"),
});

export const updatePermissionOverrideSchema = z.object({
  isGranted: z.boolean().optional(),
  isTemporary: z.boolean().optional(),
  expiresAt: z.coerce
    .date()
    .optional()
    .refine((d) => !d || !isNaN(d.getTime()), {
      message: "error.validation.invalid_dob",
    }),
  reason: z
    .string()
    .min(10, "error.validation.permission_override_message")
    .max(255, "error.validation.permission_override_message")
    .optional(),
});

export type CreatePermissionOverrideInput = z.infer<
  typeof createPermissionOverrideSchema
>;
export type UpdatePermissionOverrideInput = z.infer<
  typeof updatePermissionOverrideSchema
>;
