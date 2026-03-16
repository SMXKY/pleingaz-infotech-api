import { z } from "zod";

export const addSupplierContactSchema = z
  .object({
    name: z
      .string()
      .min(2, "error.supplier.contact_name_too_short")
      .max(100, "error.supplier.contact_name_too_long"),
    title: z
      .string()
      .max(100, "error.supplier.contact_title_too_long")
      .optional(),
    department: z
      .string()
      .max(100, "error.supplier.contact_department_too_long")
      .optional(),
    email: z.string().email("error.supplier.contact_email_invalid").optional(),
    phoneNumber: z
      .string()
      .min(6, "error.supplier.contact_phone_too_short")
      .max(20, "error.supplier.contact_phone_too_long")
      .optional(),
    isPrimary: z.boolean().optional(),
  })
  .refine((data) => data.email || data.phoneNumber, {
    message: "error.supplier.contact_requires_email_or_phone",
  });

export const updateSupplierContactSchema = z
  .object({
    name: z
      .string()
      .min(2, "error.supplier.contact_name_too_short")
      .max(100, "error.supplier.contact_name_too_long")
      .optional(),
    title: z
      .string()
      .max(100, "error.supplier.contact_title_too_long")
      .optional(),
    department: z
      .string()
      .max(100, "error.supplier.contact_department_too_long")
      .optional(),
    email: z.string().email("error.supplier.contact_email_invalid").optional(),
    phoneNumber: z
      .string()
      .min(6, "error.supplier.contact_phone_too_short")
      .max(20, "error.supplier.contact_phone_too_long")
      .optional(),
    isPrimary: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "error.supplier.contact_update_requires_at_least_one_field",
  });

export type AddSupplierContactInput = z.infer<typeof addSupplierContactSchema>;
export type UpdateSupplierContactInput = z.infer<
  typeof updateSupplierContactSchema
>;
