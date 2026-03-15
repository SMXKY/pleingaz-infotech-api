import { z } from "zod";

export const createFinanceSettingsSchema = z.object({
  id: z.enum(["MAIN"]),
  vatPct: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Must be a decimal with up to 2 decimals"),
  regulatoryTax: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Must be a decimal with up to 2 decimals"),
  updatedById: z.string().optional().nullable(),
});

export const updateFinanceSettingsSchema = z.object({
  vatPct: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Must be a decimal with up to 2 decimals")
    .optional(),
  regulatoryTax: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Must be a decimal with up to 2 decimals")
    .optional(),
  updatedById: z.string().optional().nullable(),
});

export type CreateFinanceSettingsInput = z.infer<
  typeof createFinanceSettingsSchema
>;
export type UpdateFinanceSettingsInput = z.infer<
  typeof updateFinanceSettingsSchema
>;
