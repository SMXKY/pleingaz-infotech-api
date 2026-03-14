import { z } from "zod";

export const updateNotificationPreferencesSchema = z.object({
  inApp: z.boolean().optional(),
  push: z.boolean().optional(),
  email: z.boolean().optional(),
  quietStart: z
    .string()
    .regex(
      /^([01]\d|2[0-3]):([0-5]\d)$/,
      "error.validation.invalid_time_format"
    )
    .nullable()
    .optional(),
  quietEnd: z
    .string()
    .regex(
      /^([01]\d|2[0-3]):([0-5]\d)$/,
      "error.validation.invalid_time_format"
    )
    .nullable()
    .optional(),
  typeOverrides: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
