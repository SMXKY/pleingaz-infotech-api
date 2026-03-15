import { z } from "zod";

import {
  SupplierType,
  SupplierCategory,
  SupplierTier,
  PaymentMethod,
  Currency,
  MobileMoneyProvider,
  SupplierAddressType,
} from "src/generated/prisma";

export const supplierContactSchema = z
  .object({
    name: z
      .string()
      .min(2, "error.supplier.contact_name_too_short")
      .max(100, "error.supplier.contact_name_too_long"),
    title: z
      .string()
      .max(100, "error.supplier.contact_title_too_long")
      .optional(),
    department: z
      .string()
      .max(100, "error.supplier.contact_department_too_long")
      .optional(),
    email: z.string().email("error.supplier.contact_email_invalid").optional(),
    phoneNumber: z
      .string()
      .min(6, "error.supplier.contact_phone_too_short")
      .max(20, "error.supplier.contact_phone_too_long")
      .optional(),
    isPrimary: z.boolean().optional(),
  })
  .refine((data) => data.email || data.phoneNumber, {
    message: "error.supplier.contact_requires_email_or_phone",
  });

export const supplierPaymentMethodSchema = z
  .object({
    method: z.nativeEnum(PaymentMethod, {
      error: "error.supplier.payment_method_invalid",
    }),
    label: z
      .string()
      .max(100, "error.supplier.payment_label_too_long")
      .optional(),
    currency: z.nativeEnum(Currency, {
      error: "error.supplier.payment_currency_invalid",
    }),

    bankName: z
      .string()
      .max(150, "error.supplier.bank_name_too_long")
      .optional(),
    accountNumber: z
      .string()
      .max(50, "error.supplier.account_number_too_long")
      .optional(),
    accountName: z
      .string()
      .max(150, "error.supplier.account_name_too_long")
      .optional(),
    swiftBic: z
      .string()
      .max(11, "error.supplier.swift_bic_too_long")
      .optional(),
    iban: z.string().max(34, "error.supplier.iban_too_long").optional(),

    mobileMoneyProvider: z
      .nativeEnum(MobileMoneyProvider, {
        error: "error.supplier.mobile_money_provider_invalid",
      })
      .optional(),
    mobileMoneyNumber: z
      .string()
      .min(6, "error.supplier.mobile_money_number_too_short")
      .max(20, "error.supplier.mobile_money_number_too_long")
      .optional(),
    mobileMoneyName: z
      .string()
      .max(150, "error.supplier.mobile_money_name_too_long")
      .optional(),

    isDefault: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.method === "BANK_TRANSFER") {
      if (!data.bankName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "error.supplier.bank_name_required",
          path: ["bankName"],
        });
      }
      if (!data.accountNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "error.supplier.account_number_required",
          path: ["accountNumber"],
        });
      }
    }

    if (data.method === "MOBILE_MONEY") {
      if (!data.mobileMoneyProvider) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "error.supplier.mobile_money_provider_required",
          path: ["mobileMoneyProvider"],
        });
      }
      if (!data.mobileMoneyNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "error.supplier.mobile_money_number_required",
          path: ["mobileMoneyNumber"],
        });
      }
    }
  });

export const supplierAddressSchema = z.object({
  addressType: z
    .nativeEnum(SupplierAddressType, {
      error: "error.supplier.address_type_invalid",
    })
    .optional(),
  label: z
    .string()
    .max(100, "error.supplier.address_label_too_long")
    .optional(),
  addressLine1: z
    .string()
    .max(255, "error.supplier.address_line1_too_long")
    .optional(),
  addressLine2: z
    .string()
    .max(255, "error.supplier.address_line2_too_long")
    .optional(),
  city: z.string().max(100, "error.supplier.address_city_too_long").optional(),
  region: z
    .string()
    .max(100, "error.supplier.address_region_too_long")
    .optional(),
  country: z
    .string()
    .max(100, "error.supplier.address_country_too_long")
    .optional(),

  longitude: z
    .number()
    .min(-180, "error.supplier.longitude_out_of_range")
    .max(180, "error.supplier.longitude_out_of_range")
    .optional(),
  latitude: z
    .number()
    .min(-90, "error.supplier.latitude_out_of_range")
    .max(90, "error.supplier.latitude_out_of_range")
    .optional(),

  isDefault: z.boolean().optional(),
});

export const supplierCommercialTermsSchema = z.object({
  paymentTerms: z
    .string()
    .max(255, "error.supplier.terms_payment_terms_too_long")
    .optional(),
  paymentProcess: z
    .string()
    .max(500, "error.supplier.terms_payment_process_too_long")
    .optional(),

  minOrderQuantity: z
    .number()
    .positive("error.supplier.terms_min_order_quantity_invalid")
    .optional(),
  minOrderUnit: z
    .string()
    .max(50, "error.supplier.terms_min_order_unit_too_long")
    .optional(),

  defaultCurrency: z
    .nativeEnum(Currency, {
      error: "error.supplier.terms_currency_invalid",
    })
    .optional(),

  creditLimit: z
    .number()
    .nonnegative("error.supplier.terms_credit_limit_invalid")
    .optional(),

  agreedLeadTimeDays: z
    .number()
    .int()
    .positive("error.supplier.terms_lead_time_invalid")
    .optional(),

  notes: z.string().max(1000, "error.supplier.terms_notes_too_long").optional(),
});

export const createSupplierSchema = z.object({
  code: z
    .string()
    .min(2, "error.supplier.code_too_short")
    .max(30, "error.supplier.code_too_long"),
  name: z
    .string()
    .min(2, "error.supplier.name_too_short")
    .max(150, "error.supplier.name_too_long"),
  fullName: z.string().max(255, "error.supplier.full_name_too_long").optional(),

  type: z.nativeEnum(SupplierType, {
    error: "error.supplier.type_invalid",
  }),

  category: z
    .nativeEnum(SupplierCategory, {
      error: "error.supplier.category_invalid",
    })
    .optional(),
  tier: z
    .nativeEnum(SupplierTier, {
      error: "error.supplier.tier_invalid",
    })
    .optional(),

  isPreferred: z.boolean().optional(),
  isVerifiedPartner: z.boolean().optional(),
  isActive: z.boolean().optional(),

  contacts: z
    .array(supplierContactSchema)
    .min(1, "error.supplier.contacts_required"),

  paymentMethods: z
    .array(supplierPaymentMethodSchema)
    .min(1, "error.supplier.payment_methods_required"),

  commercialTerms: supplierCommercialTermsSchema,

  addresses: z.array(supplierAddressSchema).optional(),
});

export const updateSupplierSchema = z
  .object({
    code: z
      .string()
      .min(2, "error.supplier.code_too_short")
      .max(30, "error.supplier.code_too_long")
      .optional(),
    name: z
      .string()
      .min(2, "error.supplier.name_too_short")
      .max(150, "error.supplier.name_too_long")
      .optional(),
    fullName: z
      .string()
      .max(255, "error.supplier.full_name_too_long")
      .optional(),

    type: z
      .nativeEnum(SupplierType, {
        error: "error.supplier.type_invalid",
      })
      .optional(),

    category: z
      .nativeEnum(SupplierCategory, {
        error: "error.supplier.category_invalid",
      })
      .optional(),
    tier: z
      .nativeEnum(SupplierTier, {
        error: "error.supplier.tier_invalid",
      })
      .optional(),

    isPreferred: z.boolean().optional(),
    isVerifiedPartner: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "error.supplier.update_requires_at_least_one_field",
  });

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
