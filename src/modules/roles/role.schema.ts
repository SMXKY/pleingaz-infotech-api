import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(2, "error.validation.role_name_too_short"),
  description: z.string().min(1, "error.validation.description_required"),
  isActive: z.boolean().optional().default(true),
});

export const updateRoleSchema = z.object({
  name: z.string().min(2, "error.validation.role_name_too_short").optional(),
  description: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const assignUserRoleSchema = z.object({
  roleId: z.string().uuid("error.validation.invalid_role_id"),
  userId: z.string().uuid("error.validation.invalid_user_id"),
});

export const assignRolePermissionSchema = z.object({
  roleId: z.string().uuid("error.validation.invalid_role_id"),
  permissionIds: z
    .array(z.string().uuid("error.validation.invalid_permission_id"))
    .min(1, "error.validation.at_least_one_permission_required"),
});

export const roleOverideSchema = z.object({
  roleId: z.string().uuid("error.validation.invalid_role_id"),
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

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type AssignUserRoleInput = z.infer<typeof assignUserRoleSchema>;
export type AssignRolePermissionInput = z.infer<
  typeof assignRolePermissionSchema
>;
export type RoleOverideInput = z.infer<typeof roleOverideSchema>;
