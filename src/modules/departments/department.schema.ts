import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z
    .string()
    .min(2, "error.validation.department_name_too_short")
    .transform((val) => val.trim()),
  code: z
    .string()
    .min(2, "error.validation.department_code_too_short")
    .max(10, "error.validation.department_code_too_long")
    .transform((val) => val.toUpperCase().trim()),
});

export const updateDepartmentSchema = z.object({
  name: z
    .string()
    .min(2, "error.validation.department_name_too_short")
    .transform((val) => val.trim())
    .optional(),
  code: z
    .string()
    .min(2, "error.validation.department_code_too_short")
    .max(10, "error.validation.department_code_too_long")
    .transform((val) => val.toUpperCase().trim())
    .optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
