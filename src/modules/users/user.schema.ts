import { UserCurrency, UserLanguage, UserStatus } from "@appTypes/user.types";
import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email("error.validation.invalid_email"),
  name: z.string().min(1, "error.validation.name_required"),
  surname: z.string().min(1, "error.validation.surname_required"),
  nationalIdNumber: z.string().min(1, "error.validation.national_id_required"),
  phoneNumber: z.string().optional(),
  dob: z.coerce
    .date()
    .optional()
    .refine((d) => !d || !isNaN(d.getTime()), {
      message: "error.validation.invalid_dob",
    })
    .nullable(),
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
  name: z.string().min(1).optional(),
  surname: z.string().min(1).optional(),
  phoneNumber: z.string().optional(),
  dob: z.coerce.date().optional(),
  gender: z.enum(["M", "F"]).optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhoneNumber: z.string().optional(),
  hireDate: z.coerce.date().optional(),
  status: z.enum(["ACTIVE", "TERMINATED"]).optional(),
});

export const passwordSchema = z
  .string()
  .min(8, "error.validation.password_too_short")
  .max(128, "error.validation.password_too_long")
  .regex(/[A-Z]/, "error.validation.password_needs_uppercase")
  .regex(/[a-z]/, "error.validation.password_needs_lowercase")
  .regex(/[0-9]/, "error.validation.password_needs_number")
  .regex(/[^A-Za-z0-9]/, "error.validation.password_needs_special");

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "error.validation.current_password_required"),
    newPassword: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, "error.validation.password_confirm_required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "error.validation.passwords_dont_match",
    path: ["confirmPassword"],
  });

export const setupAccountSchema = z
  .object({
    token: z.string().min(1, "error.validation.token_required"),
    username: z
      .string()
      .min(3, "error.validation.username_too_short")
      .max(30, "error.validation.username_too_long")
      .regex(/^[a-zA-Z0-9_]+$/, "error.validation.username_invalid_characters"),
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, "error.validation.password_confirm_required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "error.validation.passwords_dont_match",
    path: ["confirmPassword"],
  });

export const PasswordResetSchema = z
  .object({
    token: z.string().min(1, "error.validation.token_required"),
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, "error.validation.password_confirm_required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "error.validation.passwords_dont_match",
    path: ["confirmPassword"],
  });

export const ChangeUserCredentialsSchema = z
  .object({
    email: z.string().email("error.validation.invalid_email"),
    userId: z.string().min(1, "error.validation.user_id_required"),
    username: z
      .string()
      .min(3, "error.validation.username_too_short")
      .max(30, "error.validation.username_too_long")
      .regex(/^[a-zA-Z0-9_]+$/, "error.validation.username_invalid_characters"),
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, "error.validation.password_confirm_required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "error.validation.passwords_dont_match",
    path: ["confirmPassword"],
  });

export const userPreferenceSchema = z.object({
  language: z.nativeEnum(UserLanguage).optional(),
  currency: z.nativeEnum(UserCurrency).optional(),
});

export const updateMeSchema = z.object({
  name: z.string().min(1, "error.validation.name_required").optional(),
  surname: z.string().min(1, "error.validation.surname_required").optional(),
  nationalIdNumber: z
    .string()
    .min(1, "error.validation.national_id_required")
    .optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhoneNumber: z.string().optional(),
  preferences: userPreferenceSchema.optional(),
});

export const userDeactivateSchema = z.object({
  userId: z.string().min(1, "error.validation.user_id_required"),
  date: z.coerce.date().refine((d) => !d || !isNaN(d.getTime()), {
    message: "error.validation.invalid_dob",
  }),
});

export type SetupAccountInput = z.infer<typeof setupAccountSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof PasswordResetSchema>;
export type ChangeUserCredentialsInput = z.infer<
  typeof ChangeUserCredentialsSchema
>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type UserDeactivateInput = z.infer<typeof userDeactivateSchema>;
