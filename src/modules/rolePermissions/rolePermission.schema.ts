import { z } from "zod";

export const createRolePermissionSchema = z.object({
  roleId: z.string().uuid("error.validation.invalid_role_id"),
  permissionId: z.string().uuid("error.validation.invalid_permission_id"),
  createdById: z.string().uuid("error.validation.invalid_user_id"),
});
export const updateRolePermissionSchema = z.object({
  roleId: z.string().uuid("error.validation.invalid_role_id").optional(),
  permissionId: z
    .string()
    .uuid("error.validation.invalid_permission_id")
    .optional(),
});

export type UpdateRolePermissionInput = z.infer<
  typeof updateRolePermissionSchema
>;

export type CreateRolePermissionInput = z.infer<
  typeof createRolePermissionSchema
>;
