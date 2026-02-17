import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email("error.validation.invalid_email"),
  name: z.string().min(1, "error.validation.name_required"),
  surname: z.string().min(1, "error.validation.surname_required"),
  nationalIdNumber: z.string().min(1, "error.validation.national_id_required"),
  phoneNumber: z.string().optional(),
  dob: z.coerce.date().optional(),
  gender: z.enum(["M", "F"]).default("M"),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhoneNumber: z.string().optional(),
  hireDate: z.coerce.date().refine((d) => !isNaN(d.getTime()), {
    message: "error.validation.hire_date_invalid",
  }),
  baseSalaryInCFA: z.number().positive().optional(),
  bankName: z.string().optional(),
  cnpsNumber: z.string().optional(),
  taxId: z.string().optional(),
  departmentId: z.string().uuid("error.validation.invalid_department_id"),
  roleId: z.string().uuid("error.validation.invalid_role_id"),
});

export const updateUserSchema = z.object({
  email: z.string().email("error.validation.invalid_email").optional(),
  username: z.string().min(3, "error.validation.username_too_short").optional(),
  name: z.string().min(1).optional(),
  surname: z.string().min(1).optional(),
  phoneNumber: z.string().optional(),
  dob: z.coerce.date().optional(),
  gender: z.enum(["M", "F"]).optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhoneNumber: z.string().optional(),
  hireDate: z.coerce.date().optional(),
  baseSalaryInCFA: z.number().positive().optional(),
  bankName: z.string().optional(),
  cnpsNumber: z.string().optional(),
  taxId: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  roleId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE", "TERMINATED"]).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "error.validation.current_password_required"),
    newPassword: z.string().min(8, "error.validation.password_too_short"),
    confirmPassword: z
      .string()
      .min(1, "error.validation.password_confirm_required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "error.validation.passwords_dont_match",
    path: ["confirmPassword"],
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
