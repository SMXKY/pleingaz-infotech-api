import { z } from "zod";
import { Platform } from "src/generated/prisma";

const platformValues = Object.values(Platform) as [string, ...string[]];

export const createDeviceTokenSchema = z.object({
  token: z
    .string()
    .min(1, "error.validation.token_required")
    .max(500, "error.validation.token_too_long"),
  platform: z.enum(platformValues, {
    message: "error.validation.invalid_platform",
  }),
  deviceName: z
    .string()
    .max(100, "error.validation.device_name_too_long")
    .transform((val) => val.trim())
    .optional(),
});

export type CreateDeviceTokenInput = z.infer<typeof createDeviceTokenSchema>;
