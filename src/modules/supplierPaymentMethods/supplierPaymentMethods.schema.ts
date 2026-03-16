import { z } from "zod";
import {
  PaymentMethod,
  Currency,
  MobileMoneyProvider,
} from "src/generated/prisma";

export const addSupplierPaymentMethodSchema = z
  .object({
    method: z.nativeEnum(PaymentMethod, {
      error: "error.supplier_payment_method.method_invalid",
    }),
    label: z
      .string()
      .max(100, "error.supplier_payment_method.label_too_long")
      .optional(),
    currency: z.nativeEnum(Currency, {
      error: "error.supplier_payment_method.currency_invalid",
    }),

    bankName: z
      .string()
      .max(150, "error.supplier_payment_method.bank_name_too_long")
      .optional(),
    accountNumber: z
      .string()
      .max(50, "error.supplier_payment_method.account_number_too_long")
      .optional(),
    accountName: z
      .string()
      .max(150, "error.supplier_payment_method.account_name_too_long")
      .optional(),
    swiftBic: z
      .string()
      .max(11, "error.supplier_payment_method.swift_bic_too_long")
      .optional(),
    iban: z
      .string()
      .max(34, "error.supplier_payment_method.iban_too_long")
      .optional(),

    mobileMoneyProvider: z
      .nativeEnum(MobileMoneyProvider, {
        error: "error.supplier_payment_method.mobile_money_provider_invalid",
      })
      .optional(),
    mobileMoneyNumber: z
      .string()
      .min(6, "error.supplier_payment_method.mobile_money_number_too_short")
      .max(20, "error.supplier_payment_method.mobile_money_number_too_long")
      .optional(),
    mobileMoneyName: z
      .string()
      .max(150, "error.supplier_payment_method.mobile_money_name_too_long")
      .optional(),

    isDefault: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.method === "BANK_TRANSFER") {
      if (!data.bankName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "error.supplier_payment_method.bank_name_required",
          path: ["bankName"],
        });
      }
      if (!data.accountNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "error.supplier_payment_method.account_number_required",
          path: ["accountNumber"],
        });
      }
    }

    if (data.method === "MOBILE_MONEY") {
      if (!data.mobileMoneyProvider) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "error.supplier_payment_method.mobile_money_provider_required",
          path: ["mobileMoneyProvider"],
        });
      }
      if (!data.mobileMoneyNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "error.supplier_payment_method.mobile_money_number_required",
          path: ["mobileMoneyNumber"],
        });
      }
    }
  });

export const updateSupplierPaymentMethodSchema = z
  .object({
    method: z
      .nativeEnum(PaymentMethod, {
        error: "error.supplier_payment_method.method_invalid",
      })
      .optional(),
    label: z
      .string()
      .max(100, "error.supplier_payment_method.label_too_long")
      .optional(),
    currency: z
      .nativeEnum(Currency, {
        error: "error.supplier_payment_method.currency_invalid",
      })
      .optional(),

    bankName: z
      .string()
      .max(150, "error.supplier_payment_method.bank_name_too_long")
      .optional(),
    accountNumber: z
      .string()
      .max(50, "error.supplier_payment_method.account_number_too_long")
      .optional(),
    accountName: z
      .string()
      .max(150, "error.supplier_payment_method.account_name_too_long")
      .optional(),
    swiftBic: z
      .string()
      .max(11, "error.supplier_payment_method.swift_bic_too_long")
      .optional(),
    iban: z
      .string()
      .max(34, "error.supplier_payment_method.iban_too_long")
      .optional(),

    mobileMoneyProvider: z
      .nativeEnum(MobileMoneyProvider, {
        error: "error.supplier_payment_method.mobile_money_provider_invalid",
      })
      .optional(),
    mobileMoneyNumber: z
      .string()
      .min(6, "error.supplier_payment_method.mobile_money_number_too_short")
      .max(20, "error.supplier_payment_method.mobile_money_number_too_long")
      .optional(),
    mobileMoneyName: z
      .string()
      .max(150, "error.supplier_payment_method.mobile_money_name_too_long")
      .optional(),

    isDefault: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "error.supplier_payment_method.update_requires_at_least_one_field",
  });

export type AddSupplierPaymentMethodInput = z.infer<
  typeof addSupplierPaymentMethodSchema
>;
export type UpdateSupplierPaymentMethodInput = z.infer<
  typeof updateSupplierPaymentMethodSchema
>;
