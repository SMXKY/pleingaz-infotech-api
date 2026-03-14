import { z } from "zod";
import {
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  Platform,
} from "src/generated/prisma";

const notificationTypeValues = Object.values(NotificationType) as [
  string,
  ...string[]
];
const notificationPriorityValues = Object.values(NotificationPriority) as [
  string,
  ...string[]
];
const notificationStatusValues = Object.values(NotificationStatus) as [
  string,
  ...string[]
];
const platformValues = Object.values(Platform) as [string, ...string[]];

const notificationTargetSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("user"),
    userId: z.string().uuid("error.validation.invalid_user_id"),
  }),
  z.object({
    type: z.literal("users"),
    userIds: z
      .array(z.string().uuid("error.validation.invalid_user_id"))
      .min(1, "error.validation.users_required"),
  }),
  z.object({
    type: z.literal("role"),
    roleId: z.string().uuid("error.validation.invalid_role_id"),
  }),
  z.object({
    type: z.literal("permission"),
    permission: z.string().min(1, "error.validation.permission_required"),
  }),
  z.object({
    type: z.literal("department"),
    departmentId: z.string().uuid("error.validation.invalid_department_id"),
  }),
  z.object({
    type: z.literal("all"),
  }),
]);

export const createNotificationSchema = z.object({
  type: z.enum(notificationTypeValues, {
    message: "error.validation.invalid_notification_type",
  }),
  priority: z
    .enum(notificationPriorityValues, {
      message: "error.validation.invalid_notification_priority",
    })
    .optional(),
  target: notificationTargetSchema,
  title: z
    .string()
    .min(1, "error.validation.title_required")
    .max(200, "error.validation.title_too_long")
    .transform((val) => val.trim()),
  body: z
    .string()
    .min(1, "error.validation.body_required")
    .max(1000, "error.validation.body_too_long")
    .transform((val) => val.trim()),
  data: z.record(z.string(), z.unknown()).optional(),
  actionUrl: z
    .string()
    .max(500, "error.validation.action_url_too_long")
    .optional(),
  refTable: z
    .string()
    .max(100, "error.validation.ref_table_too_long")
    .optional(),
  refId: z.string().uuid("error.validation.invalid_ref_id").optional(),
  groupKey: z
    .string()
    .max(100, "error.validation.group_key_too_long")
    .optional(),
  expiresAt: z
    .string()
    .datetime("error.validation.invalid_expires_at")
    .transform((val) => new Date(val))
    .optional(),
});

export const getNotificationsQuerySchema = z.object({
  status: z
    .union([
      z.enum(notificationStatusValues),
      z.array(z.enum(notificationStatusValues)),
    ])
    .optional()
    .transform((val) => (val ? (Array.isArray(val) ? val : [val]) : undefined)),
  type: z
    .union([
      z.enum(notificationTypeValues),
      z.array(z.enum(notificationTypeValues)),
    ])
    .optional()
    .transform((val) => (val ? (Array.isArray(val) ? val : [val]) : undefined)),
  priority: z
    .union([
      z.enum(notificationPriorityValues),
      z.array(z.enum(notificationPriorityValues)),
    ])
    .optional()
    .transform((val) => (val ? (Array.isArray(val) ? val : [val]) : undefined)),
  since: z
    .string()
    .datetime("error.validation.invalid_since")
    .transform((val) => new Date(val))
    .optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100))
    .optional(),
  cursor: z.string().uuid("error.validation.invalid_cursor").optional(),
});

export const markNotificationReadSchema = z.object({
  id: z.string().uuid("error.validation.invalid_notification_id"),
});

export const registerDeviceTokenSchema = z.object({
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

export const removeDeviceTokenSchema = z.object({
  token: z.string().min(1, "error.validation.token_required"),
});

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
    .optional()
    .nullable(),
  quietEnd: z
    .string()
    .regex(
      /^([01]\d|2[0-3]):([0-5]\d)$/,
      "error.validation.invalid_time_format"
    )
    .optional()
    .nullable(),
  typeOverrides: z.record(z.string(), z.unknown()).optional(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type GetNotificationsQuery = z.infer<typeof getNotificationsQuerySchema>;
export type MarkNotificationReadInput = z.infer<
  typeof markNotificationReadSchema
>;
export type RegisterDeviceTokenInput = z.infer<
  typeof registerDeviceTokenSchema
>;
export type RemoveDeviceTokenInput = z.infer<typeof removeDeviceTokenSchema>;
export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
