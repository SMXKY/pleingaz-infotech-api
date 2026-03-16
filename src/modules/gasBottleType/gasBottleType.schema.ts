import { z } from "zod";

export const updateBottleTypeSchema = z
  .object({
    name: z
      .string()
      .min(2, "error.bottle_type.name_too_short")
      .max(100, "error.bottle_type.name_too_long")
      .optional(),
    description: z
      .string()
      .max(500, "error.bottle_type.description_too_long")
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "error.bottle_type.update_requires_at_least_one_field",
  });

export type UpdateBottleTypeInput = z.infer<typeof updateBottleTypeSchema>;
