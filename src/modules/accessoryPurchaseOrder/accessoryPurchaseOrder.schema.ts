import { z } from "zod";
import { Currency, TransportMode } from "src/generated/prisma";

const lineItemSchema = z.object({
  itemId: z.string().uuid("error.accessory_order.invalid_item_id"),
  quantity: z
    .number()
    .int("error.accessory_order.item_quantity_must_be_integer")
    .positive("error.accessory_order.item_quantity_invalid"),
  unitPrice: z
    .number()
    .positive("error.accessory_order.item_unit_price_invalid"),
  isHighPriority: z.boolean().optional(),
});

export const createAccessoryPurchaseOrderSchema = z.object({
  depotId: z.string().uuid("error.accessory_order.invalid_depot_id"),
  supplierId: z.string().uuid("error.accessory_order.invalid_supplier_id"),
  currency: z
    .nativeEnum(Currency, {
      error: "error.accessory_order.currency_invalid",
    })
    .optional(),
  vatPct: z
    .number()
    .min(0, "error.accessory_order.vat_pct_invalid")
    .max(100, "error.accessory_order.vat_pct_invalid"),
  transportMode: z.nativeEnum(TransportMode, {
    error: "error.accessory_order.transport_mode_invalid",
  }),
  estimatedTransitDays: z
    .number()
    .int("error.accessory_order.transit_days_must_be_integer")
    .positive("error.accessory_order.transit_days_invalid")
    .optional()
    .nullable(),
  estimatedArrivalDate: z.coerce.date().optional().nullable(),
  preferredCarrier: z
    .string()
    .max(200, "error.accessory_order.carrier_too_long")
    .optional()
    .nullable(),
  logisticsNotes: z
    .string()
    .max(1000, "error.accessory_order.logistics_notes_too_long")
    .optional()
    .nullable(),
  freightFees: z
    .number()
    .min(0, "error.accessory_order.freight_fees_invalid")
    .optional()
    .nullable(),
  customsDuties: z
    .number()
    .min(0, "error.accessory_order.customs_duties_invalid")
    .optional()
    .nullable(),
  insuranceAmount: z
    .number()
    .min(0, "error.accessory_order.insurance_amount_invalid")
    .optional()
    .nullable(),
  hasInsurance: z.boolean().optional(),
  notes: z
    .string()
    .max(1000, "error.accessory_order.notes_too_long")
    .optional()
    .nullable(),
  internalNotes: z
    .string()
    .max(1000, "error.accessory_order.internal_notes_too_long")
    .optional()
    .nullable(),
  lineItems: z
    .array(lineItemSchema)
    .min(1, "error.accessory_order.line_items_required"),
});

export type CreateAccessoryPurchaseOrderInput = z.infer<
  typeof createAccessoryPurchaseOrderSchema
>;

export const updateAccessoryPurchaseOrderSchema = z.object({
  depotId: z.string().uuid("error.accessory_order.invalid_depot_id"),
  supplierId: z.string().uuid("error.accessory_order.invalid_supplier_id"),
  currency: z
    .nativeEnum(Currency, {
      error: "error.accessory_order.currency_invalid",
    })
    .optional(),
  vatPct: z
    .number()
    .min(0, "error.accessory_order.vat_pct_invalid")
    .max(100, "error.accessory_order.vat_pct_invalid"),
  transportMode: z.nativeEnum(TransportMode, {
    error: "error.accessory_order.transport_mode_invalid",
  }),
  estimatedTransitDays: z
    .number()
    .int("error.accessory_order.transit_days_must_be_integer")
    .positive("error.accessory_order.transit_days_invalid")
    .optional()
    .nullable(),
  estimatedArrivalDate: z.coerce.date().optional().nullable(),
  preferredCarrier: z
    .string()
    .max(200, "error.accessory_order.carrier_too_long")
    .optional()
    .nullable(),
  logisticsNotes: z
    .string()
    .max(1000, "error.accessory_order.logistics_notes_too_long")
    .optional()
    .nullable(),
  freightFees: z
    .number()
    .min(0, "error.accessory_order.freight_fees_invalid")
    .optional()
    .nullable(),
  customsDuties: z
    .number()
    .min(0, "error.accessory_order.customs_duties_invalid")
    .optional()
    .nullable(),
  insuranceAmount: z
    .number()
    .min(0, "error.accessory_order.insurance_amount_invalid")
    .optional()
    .nullable(),
  hasInsurance: z.boolean().optional(),
  notes: z
    .string()
    .max(1000, "error.accessory_order.notes_too_long")
    .optional()
    .nullable(),
  internalNotes: z
    .string()
    .max(1000, "error.accessory_order.internal_notes_too_long")
    .optional()
    .nullable(),
  lineItems: z
    .array(lineItemSchema)
    .min(1, "error.accessory_order.line_items_required"),
});

export type UpdateAccessoryPurchaseOrderInput = z.infer<
  typeof updateAccessoryPurchaseOrderSchema
>;
