import { z } from "zod";
import { Currency } from "src/generated/prisma";

export const createAccessoryItemSchema = z.object({
  categoryId: z.string().uuid("error.accessory_item.invalid_category_id"),
  sku: z
    .string()
    .min(2, "error.accessory_item.sku_too_short")
    .max(50, "error.accessory_item.sku_too_long"),
  name: z
    .string()
    .min(2, "error.accessory_item.name_too_short")
    .max(150, "error.accessory_item.name_too_long"),
  description: z
    .string()
    .max(500, "error.accessory_item.description_too_long")
    .optional(),
  color: z
    .string()
    .max(50, "error.accessory_item.color_too_long")
    .optional(),
  material: z
    .string()
    .max(100, "error.accessory_item.material_too_long")
    .optional(),
  complianceStandard: z
    .string()
    .max(100, "error.accessory_item.compliance_standard_too_long")
    .optional(),
  usageType: z
    .string()
    .max(100, "error.accessory_item.usage_type_too_long")
    .optional(),
  defaultCurrency: z
    .nativeEnum(Currency, {
      error: "error.accessory_item.currency_invalid",
    })
    .optional(),
  unitPrice: z
    .number()
    .nonnegative("error.accessory_item.unit_price_invalid"),
  reorderLevel: z
    .number()
    .int()
    .nonnegative("error.accessory_item.reorder_level_invalid")
    .optional(),
  currentStock: z
    .number()
    .int()
    .nonnegative("error.accessory_item.current_stock_invalid")
    .optional(),
  isHighPriority: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateAccessoryItemSchema = z
  .object({
    categoryId: z
      .string()
      .uuid("error.accessory_item.invalid_category_id")
      .optional(),
    sku: z
      .string()
      .min(2, "error.accessory_item.sku_too_short")
      .max(50, "error.accessory_item.sku_too_long")
      .optional(),
    name: z
      .string()
      .min(2, "error.accessory_item.name_too_short")
      .max(150, "error.accessory_item.name_too_long")
      .optional(),
    description: z
      .string()
      .max(500, "error.accessory_item.description_too_long")
      .optional(),
    color: z
      .string()
      .max(50, "error.accessory_item.color_too_long")
      .optional(),
    material: z
      .string()
      .max(100, "error.accessory_item.material_too_long")
      .optional(),
    complianceStandard: z
      .string()
      .max(100, "error.accessory_item.compliance_standard_too_long")
      .optional(),
    usageType: z
      .string()
      .max(100, "error.accessory_item.usage_type_too_long")
      .optional(),
    defaultCurrency: z
      .nativeEnum(Currency, {
        error: "error.accessory_item.currency_invalid",
      })
      .optional(),
    unitPrice: z
      .number()
      .nonnegative("error.accessory_item.unit_price_invalid")
      .optional(),
    reorderLevel: z
      .number()
      .int()
      .nonnegative("error.accessory_item.reorder_level_invalid")
      .optional(),
    currentStock: z
      .number()
      .int()
      .nonnegative("error.accessory_item.current_stock_invalid")
      .optional(),
    isHighPriority: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "error.accessory_item.update_requires_at_least_one_field",
  });

export type CreateAccessoryItemInput = z.infer<typeof createAccessoryItemSchema>;
export type UpdateAccessoryItemInput = z.infer<typeof updateAccessoryItemSchema>;
