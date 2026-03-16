import { z } from "zod";
import { SupplierAddressType } from "src/generated/prisma";

export const addSupplierAddressSchema = z.object({
  addressType: z
    .nativeEnum(SupplierAddressType, {
      error: "error.supplier_address.address_type_invalid",
    })
    .optional(),
  label: z
    .string()
    .max(100, "error.supplier_address.label_too_long")
    .optional(),
  addressLine1: z
    .string()
    .max(255, "error.supplier_address.address_line1_too_long")
    .optional(),
  addressLine2: z
    .string()
    .max(255, "error.supplier_address.address_line2_too_long")
    .optional(),
  city: z.string().max(100, "error.supplier_address.city_too_long").optional(),
  region: z
    .string()
    .max(100, "error.supplier_address.region_too_long")
    .optional(),
  country: z
    .string()
    .max(100, "error.supplier_address.country_too_long")
    .optional(),
  longitude: z
    .number()
    .min(-180, "error.supplier_address.longitude_out_of_range")
    .max(180, "error.supplier_address.longitude_out_of_range")
    .optional(),
  latitude: z
    .number()
    .min(-90, "error.supplier_address.latitude_out_of_range")
    .max(90, "error.supplier_address.latitude_out_of_range")
    .optional(),
  isDefault: z.boolean().optional(),
});

export const updateSupplierAddressSchema = z
  .object({
    addressType: z
      .nativeEnum(SupplierAddressType, {
        error: "error.supplier_address.address_type_invalid",
      })
      .optional(),
    label: z
      .string()
      .max(100, "error.supplier_address.label_too_long")
      .optional(),
    addressLine1: z
      .string()
      .max(255, "error.supplier_address.address_line1_too_long")
      .optional(),
    addressLine2: z
      .string()
      .max(255, "error.supplier_address.address_line2_too_long")
      .optional(),
    city: z
      .string()
      .max(100, "error.supplier_address.city_too_long")
      .optional(),
    region: z
      .string()
      .max(100, "error.supplier_address.region_too_long")
      .optional(),
    country: z
      .string()
      .max(100, "error.supplier_address.country_too_long")
      .optional(),
    longitude: z
      .number()
      .min(-180, "error.supplier_address.longitude_out_of_range")
      .max(180, "error.supplier_address.longitude_out_of_range")
      .optional(),
    latitude: z
      .number()
      .min(-90, "error.supplier_address.latitude_out_of_range")
      .max(90, "error.supplier_address.latitude_out_of_range")
      .optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "error.supplier_address.update_requires_at_least_one_field",
  });

export type AddSupplierAddressInput = z.infer<typeof addSupplierAddressSchema>;
export type UpdateSupplierAddressInput = z.infer<
  typeof updateSupplierAddressSchema
>;
