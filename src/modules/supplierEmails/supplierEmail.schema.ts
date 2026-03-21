import { OrderType } from "@appTypes/OrderEmail.types";
import { z } from "zod";

export const createSupplierEmailSchema = z.object({
  supplierId: z.string().uuid("error.supplier.invalid_supplier_id"),
  contactId: z.string().uuid("error.supplier.invalid_supplier_contact_id"),
  orderId: z.string().uuid("error.order.invalid_order_id"),
  orderType: z.nativeEnum(OrderType, {
    error: "error.gas_order.type_invalid",
  }),
  message: z.string().min(1, "error.orderEmail.message_required"),
});

export type CreateSupplierEmailInput = z.infer<
  typeof createSupplierEmailSchema
>;
