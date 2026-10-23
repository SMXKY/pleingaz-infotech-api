import { z } from "zod";
import { Currency } from "src/generated/prisma";

export const updateSupplierCommercialTermsSchema = z
  .object({
    paymentTerms: z
      .string()
      .max(255, "error.supplier_commercial_terms.payment_terms_too_long")
      .optional(),
    paymentProcess: z
      .string()
      .max(500, "error.supplier_commercial_terms.payment_process_too_long")
      .optional(),
    minOrderQuantity: z
      .number()
      .positive("error.supplier_commercial_terms.min_order_quantity_invalid")
      .optional(),
    minOrderUnit: z
      .string()
      .max(50, "error.supplier_commercial_terms.min_order_unit_too_long")
      .optional(),
    defaultCurrency: z
      .nativeEnum(Currency, {
        error: "error.supplier_commercial_terms.currency_invalid",
      })
      .optional(),
    creditLimit: z
      .number()
      .nonnegative("error.supplier_commercial_terms.credit_limit_invalid")
      .optional(),
    agreedLeadTimeDays: z
      .number()
      .int()
      .positive("error.supplier_commercial_terms.lead_time_invalid")
      .optional(),
    notes: z
      .string()
      .max(1000, "error.supplier_commercial_terms.notes_too_long")
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message:
      "error.supplier_commercial_terms.update_requires_at_least_one_field",
  });

export type UpdateSupplierCommercialTermsInput = z.infer<
  typeof updateSupplierCommercialTermsSchema
>;
