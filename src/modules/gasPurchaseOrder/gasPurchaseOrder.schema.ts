import { z } from "zod";
import { OrderPriority, Currency, GasUnit } from "src/generated/prisma";

const tankerSchema = z.object({
  tankerId: z.string().uuid("error.gas_order.invalid_tanker_id"),
  collectionDate: z.coerce.date().optional().nullable(),
});

const lineItemSchema = z.object({
  code: z
    .string()
    .max(50, "error.gas_order.item_code_too_long")
    .optional()
    .nullable(),
  name: z
    .string()
    .min(1, "error.gas_order.item_name_required")
    .max(200, "error.gas_order.item_name_too_long"),
  description: z
    .string()
    .max(500, "error.gas_order.item_description_too_long")
    .optional()
    .nullable(),
  grade: z
    .string()
    .max(50, "error.gas_order.item_grade_too_long")
    .optional()
    .nullable(),
  quantity: z.number().positive("error.gas_order.item_quantity_invalid"),
  unit: z.nativeEnum(GasUnit, {
    error: "error.gas_order.item_unit_invalid",
  }),
  unitPrice: z.number().positive("error.gas_order.item_unit_price_invalid"),
});

export const createGasPurchaseOrderSchema = z.object({
  depotId: z.string().uuid("error.gas_order.invalid_depot_id"),
  supplierId: z.string().uuid("error.gas_order.invalid_supplier_id"),
  priority: z
    .nativeEnum(OrderPriority, {
      error: "error.gas_order.priority_invalid",
    })
    .optional(),
  currency: z
    .nativeEnum(Currency, {
      error: "error.gas_order.currency_invalid",
    })
    .optional(),
  notes: z
    .string()
    .max(1000, "error.gas_order.notes_too_long")
    .optional()
    .nullable(),
  internalNotes: z
    .string()
    .max(1000, "error.gas_order.internal_notes_too_long")
    .optional()
    .nullable(),
  requestedDate: z.coerce.date().optional().nullable(),
  collectionDate: z.coerce.date().optional().nullable(),
  tankers: z.array(tankerSchema).min(1, "error.gas_order.tankers_required"),
  lineItems: z
    .array(lineItemSchema)
    .min(1, "error.gas_order.line_items_required"),
});

export type CreateGasPurchaseOrderInput = z.infer<
  typeof createGasPurchaseOrderSchema
>;

export const updateGasPurchaseOrderSchema = z.object({
  depotId: z.string().uuid("error.gas_order.invalid_depot_id"),
  supplierId: z.string().uuid("error.gas_order.invalid_supplier_id"),
  priority: z
    .nativeEnum(OrderPriority, {
      error: "error.gas_order.priority_invalid",
    })
    .optional(),
  currency: z
    .nativeEnum(Currency, {
      error: "error.gas_order.currency_invalid",
    })
    .optional(),
  notes: z
    .string()
    .max(1000, "error.gas_order.notes_too_long")
    .optional()
    .nullable(),
  internalNotes: z
    .string()
    .max(1000, "error.gas_order.internal_notes_too_long")
    .optional()
    .nullable(),
  requestedDate: z.coerce.date().optional().nullable(),
  collectionDate: z.coerce.date().optional().nullable(),
  tankers: z.array(tankerSchema).min(1, "error.gas_order.tankers_required"),
  lineItems: z
    .array(lineItemSchema)
    .min(1, "error.gas_order.line_items_required"),
});

export type UpdateGasPurchaseOrderInput = z.infer<
  typeof updateGasPurchaseOrderSchema
>;
