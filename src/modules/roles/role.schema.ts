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

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
