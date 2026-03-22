import { z } from "zod";
import {
  PaymentMethod,
  PaymentRecipientType,
  MobileMoneyProvider,
  Currency,
} from "src/generated/prisma";

enum RefTable {
  GAS_PURCHASE_ORDERS = "gas_purchase_orders",
  GAS_BOTTLE_PURCHASE_ORDERS = "gas_bottle_purchase_orders",
  ACCESSORY_PURCHASE_ORDERS = "accessory_purchase_orders",
}

export const recordPaymentSchema = z
  .object({
    orderId: z.string().uuid("error.payment.invalid_order_id"),

    recipientType: z.nativeEnum(PaymentRecipientType, {
      error: "error.payment.recipient_type_invalid",
    }),
    refTable: z.nativeEnum(RefTable, {
      error: "error.payment.ref_table_invalid",
    }),
    recipientName: z
      .string()
      .min(1, "error.payment.recipient_name_required")
      .max(200, "error.payment.recipient_name_too_long"),
    recipientSupplierId: z
      .string()
      .uuid("error.payment.invalid_supplier_id")
      .optional()
      .nullable(),
    recipientUserId: z
      .string()
      .uuid("error.payment.invalid_user_id")
      .optional()
      .nullable(),

    method: z.nativeEnum(PaymentMethod, {
      error: "error.payment.method_invalid",
    }),
    bankName: z
      .string()
      .max(200, "error.payment.bank_name_too_long")
      .optional()
      .nullable(),
    transactionReference: z
      .string()
      .max(200, "error.payment.transaction_reference_too_long")
      .optional()
      .nullable(),
    mobileMoneyProvider: z
      .nativeEnum(MobileMoneyProvider, {
        error: "error.payment.mobile_money_provider_invalid",
      })
      .optional()
      .nullable(),
    checkNumber: z
      .string()
      .max(100, "error.payment.check_number_too_long")
      .optional()
      .nullable(),

    amount: z.number().positive("error.payment.amount_must_be_positive"),
    currency: z.nativeEnum(Currency, {
      error: "error.payment.currency_invalid",
    }),
    amountInCfa: z
      .number()
      .positive("error.payment.amount_in_cfa_must_be_positive"),

    paidAt: z.coerce.date({ message: "error.payment.paid_at_required" }),

    purpose: z
      .string()
      .max(500, "error.payment.purpose_too_long")
      .optional()
      .nullable(),
    notes: z
      .string()
      .max(1000, "error.payment.notes_too_long")
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (
      data.recipientType === PaymentRecipientType.SUPPLIER &&
      !data.recipientSupplierId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "error.payment.supplier_id_required_for_supplier_recipient",
        path: ["recipientSupplierId"],
      });
    }
    if (
      (data.recipientType === PaymentRecipientType.EMPLOYEE ||
        data.recipientType === PaymentRecipientType.DRIVER) &&
      !data.recipientUserId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "error.payment.user_id_required_for_user_recipient",
        path: ["recipientUserId"],
      });
    }

    if (data.method === PaymentMethod.BANK_TRANSFER) {
      if (!data.bankName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "error.payment.bank_name_required_for_bank_transfer",
          path: ["bankName"],
        });
      }
      if (!data.transactionReference) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "error.payment.transaction_reference_required_for_bank_transfer",
          path: ["transactionReference"],
        });
      }
    }
    if (
      data.method === PaymentMethod.MOBILE_MONEY &&
      !data.mobileMoneyProvider
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "error.payment.mobile_money_provider_required",
        path: ["mobileMoneyProvider"],
      });
    }
    if (data.method === PaymentMethod.CHECK && !data.checkNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "error.payment.check_number_required_for_check",
        path: ["checkNumber"],
      });
    }
  });

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const reversePaymentSchema = z.object({
  notes: z
    .string()
    .max(1000, "error.payment.notes_too_long")
    .optional()
    .nullable(),
});

export type ReversePaymentInput = z.infer<typeof reversePaymentSchema>;

export const correctPaymentSchema = z
  .object({
    recipientType: z.nativeEnum(PaymentRecipientType, {
      error: "error.payment.recipient_type_invalid",
    }),
    recipientName: z
      .string()
      .min(1, "error.payment.recipient_name_required")
      .max(200, "error.payment.recipient_name_too_long"),
    recipientSupplierId: z
      .string()
      .uuid("error.payment.invalid_supplier_id")
      .optional()
      .nullable(),
    recipientUserId: z
      .string()
      .uuid("error.payment.invalid_user_id")
      .optional()
      .nullable(),

    method: z.nativeEnum(PaymentMethod, {
      error: "error.payment.method_invalid",
    }),
    bankName: z
      .string()
      .max(200, "error.payment.bank_name_too_long")
      .optional()
      .nullable(),
    transactionReference: z
      .string()
      .max(200, "error.payment.transaction_reference_too_long")
      .optional()
      .nullable(),
    mobileMoneyProvider: z
      .nativeEnum(MobileMoneyProvider, {
        error: "error.payment.mobile_money_provider_invalid",
      })
      .optional()
      .nullable(),
    checkNumber: z
      .string()
      .max(100, "error.payment.check_number_too_long")
      .optional()
      .nullable(),

    amount: z.number().positive("error.payment.amount_must_be_positive"),
    currency: z.nativeEnum(Currency, {
      error: "error.payment.currency_invalid",
    }),
    amountInCfa: z
      .number()
      .positive("error.payment.amount_in_cfa_must_be_positive"),

    paidAt: z.coerce.date({ message: "error.payment.paid_at_required" }),

    purpose: z
      .string()
      .max(500, "error.payment.purpose_too_long")
      .optional()
      .nullable(),
    notes: z
      .string()
      .max(1000, "error.payment.notes_too_long")
      .optional()
      .nullable(),

    reversalNotes: z
      .string()
      .max(1000, "error.payment.notes_too_long")
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (
      data.recipientType === PaymentRecipientType.SUPPLIER &&
      !data.recipientSupplierId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "error.payment.supplier_id_required_for_supplier_recipient",
        path: ["recipientSupplierId"],
      });
    }
    if (
      (data.recipientType === PaymentRecipientType.EMPLOYEE ||
        data.recipientType === PaymentRecipientType.DRIVER) &&
      !data.recipientUserId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "error.payment.user_id_required_for_user_recipient",
        path: ["recipientUserId"],
      });
    }

    if (data.method === PaymentMethod.BANK_TRANSFER) {
      if (!data.bankName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "error.payment.bank_name_required_for_bank_transfer",
          path: ["bankName"],
        });
      }
      if (!data.transactionReference) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "error.payment.transaction_reference_required_for_bank_transfer",
          path: ["transactionReference"],
        });
      }
    }
    if (
      data.method === PaymentMethod.MOBILE_MONEY &&
      !data.mobileMoneyProvider
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "error.payment.mobile_money_provider_required",
        path: ["mobileMoneyProvider"],
      });
    }
    if (data.method === PaymentMethod.CHECK && !data.checkNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "error.payment.check_number_required_for_check",
        path: ["checkNumber"],
      });
    }
  });

export type CorrectPaymentInput = z.infer<typeof correctPaymentSchema>;

export const updatePaymentNotesSchema = z.object({
  notes: z
    .string()
    .max(1000, "error.payment.notes_too_long")
    .optional()
    .nullable(),
  purpose: z
    .string()
    .max(500, "error.payment.purpose_too_long")
    .optional()
    .nullable(),
});

export type UpdatePaymentNotesInput = z.infer<typeof updatePaymentNotesSchema>;
