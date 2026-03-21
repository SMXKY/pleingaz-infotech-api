import { z } from "zod";
import { Currency } from "src/generated/prisma";

const lineItemSchema = z.object({
  bottleTypeId: z
    .string()
    .uuid("error.gas_bottle_order.invalid_bottle_type_id"),
  quantity: z
    .number()
    .int("error.gas_bottle_order.item_quantity_must_be_integer")
    .positive("error.gas_bottle_order.item_quantity_invalid"),
  unitPrice: z
    .number()
    .positive("error.gas_bottle_order.item_unit_price_invalid"),
});

export const createGasBottlePurchaseOrderSchema = z.object({
  depotId: z.string().uuid("error.gas_bottle_order.invalid_depot_id"),
  supplierId: z.string().uuid("error.gas_bottle_order.invalid_supplier_id"),
  currency: z
    .nativeEnum(Currency, {
      error: "error.gas_bottle_order.currency_invalid",
    })
    .optional(),
  vatPct: z
    .number()
    .min(0, "error.gas_bottle_order.vat_pct_invalid")
    .max(100, "error.gas_bottle_order.vat_pct_invalid"),
  shippingCost: z
    .number()
    .min(0, "error.gas_bottle_order.shipping_cost_invalid")
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(1000, "error.gas_bottle_order.notes_too_long")
    .optional()
    .nullable(),
  internalNotes: z
    .string()
    .max(1000, "error.gas_bottle_order.internal_notes_too_long")
    .optional()
    .nullable(),
  requestedDeliveryDate: z.coerce.date().optional().nullable(),
  lineItems: z
    .array(lineItemSchema)
    .min(1, "error.gas_bottle_order.line_items_required"),
});

export type CreateGasBottlePurchaseOrderInput = z.infer<
  typeof createGasBottlePurchaseOrderSchema
>;

export const updateGasBottlePurchaseOrderSchema = z.object({
  depotId: z.string().uuid("error.gas_bottle_order.invalid_depot_id"),
  supplierId: z.string().uuid("error.gas_bottle_order.invalid_supplier_id"),
  currency: z
    .nativeEnum(Currency, {
      error: "error.gas_bottle_order.currency_invalid",
    })
    .optional(),
  vatPct: z
    .number()
    .min(0, "error.gas_bottle_order.vat_pct_invalid")
    .max(100, "error.gas_bottle_order.vat_pct_invalid"),
  shippingCost: z
    .number()
    .min(0, "error.gas_bottle_order.shipping_cost_invalid")
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(1000, "error.gas_bottle_order.notes_too_long")
    .optional()
    .nullable(),
  internalNotes: z
    .string()
    .max(1000, "error.gas_bottle_order.internal_notes_too_long")
    .optional()
    .nullable(),
  requestedDeliveryDate: z.coerce.date().optional().nullable(),
  lineItems: z
    .array(lineItemSchema)
    .min(1, "error.gas_bottle_order.line_items_required"),
});

export type UpdateGasBottlePurchaseOrderInput = z.infer<
  typeof updateGasBottlePurchaseOrderSchema
>;
