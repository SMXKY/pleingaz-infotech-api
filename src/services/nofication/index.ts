import prisma from "@models/index.model";
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  DeliveryChannel,
  Prisma,
  Status,
} from "src/generated/prisma";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_BATCH_SIZE,
} from "@utils/enviromentVariablesCheck.util";

export type NotificationTarget =
  | { type: "user"; userId: string }
  | { type: "users"; userIds: string[] }
  | { type: "role"; roleId: string }
  | { type: "permission"; permission: string }
  | { type: "department"; departmentId: string }
  | { type: "all" };

export interface CreateNotificationInput {
  type: NotificationType;
  priority?: NotificationPriority;
  target: NotificationTarget;
  titleFrench: string;
  bodyFrench: string;
  titleEnglish: string;
  bodyEnglish: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
  refTable?: string;
  refId?: string;
  groupKey?: string;
  expiresAt?: Date;
}

export interface GetNotificationsOptions {
  status?: NotificationStatus[];
  type?: NotificationType[];
  priority?: NotificationPriority[];
  since?: Date;
  limit?: number;
  cursor?: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  cursor: string | null;
  hasMore: boolean;
  unreadCount: number;
}

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  titleFrench: string;
  bodyFrench: string;
  titleEnglish: string;
  bodyEnglish: string;
  data?: Record<string, unknown> | null;
  actionUrl?: string | null;
  refTable?: string | null;
  refId?: string | null;
  groupKey?: string | null;
  createdAt: string;
}

async function resolveByUser(userId: string): Promise<string[]> {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      status: Status.ACTIVE,
      deletedAt: null,
    },
    select: { id: true },
  });

  return user ? [user.id] : [];
}

async function resolveByUsers(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      status: Status.ACTIVE,
      deletedAt: null,
    },
    select: { id: true },
  });

  return users.map((u) => u.id);
}

async function resolveByRole(roleId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      roleId,
      status: Status.ACTIVE,
      deletedAt: null,
    },
    select: { id: true },
  });

  return users.map((u) => u.id);
}

async function resolveByPermission(permission: string): Promise<string[]> {
  const usersViaRole = await prisma.user.findMany({
    where: {
      status: Status.ACTIVE,
      deletedAt: null,
      role: {
        deletedAt: null,
        rolePermissions: {
          some: {
            deletedAt: null,
            permission: {
              code: permission,
              deletedAt: null,
            },
          },
        },
      },
    },
    select: { id: true },
  });

  const usersViaGrantedOverride = await prisma.user.findMany({
    where: {
      status: Status.ACTIVE,
      deletedAt: null,
      permissionOverrides: {
        some: {
          isGranted: true,
          deletedAt: null,
          permission: {
            code: permission,
            deletedAt: null,
          },
        },
      },
    },
    select: { id: true },
  });

  const usersViaDeniedOverride = await prisma.user.findMany({
    where: {
      status: Status.ACTIVE,
      deletedAt: null,
      permissionOverrides: {
        some: {
          isGranted: false,
          deletedAt: null,
          permission: {
            code: permission,
            deletedAt: null,
          },
        },
      },
    },
    select: { id: true },
  });

  const grantedUsers = new Set([
    ...usersViaRole.map((u) => u.id),
    ...usersViaGrantedOverride.map((u) => u.id),
  ]);

  for (const denied of usersViaDeniedOverride) {
    grantedUsers.delete(denied.id);
  }

  return Array.from(grantedUsers);
}

async function resolveByDepartment(departmentId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      departmentId,
      status: Status.ACTIVE,
      deletedAt: null,
    },
    select: { id: true },
  });

  return users.map((u) => u.id);
}

async function resolveAll(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      status: Status.ACTIVE,
      deletedAt: null,
    },
    select: { id: true },
  });

  return users.map((u) => u.id);
}

async function resolveRecipients(
  target: NotificationTarget
): Promise<string[]> {
  switch (target.type) {
    case "user":
      return resolveByUser(target.userId);
    case "users":
      return resolveByUsers(target.userIds);
    case "role":
      return resolveByRole(target.roleId);
    case "permission":
      return resolveByPermission(target.permission);
    case "department":
      return resolveByDepartment(target.departmentId);
    case "all":
      return resolveAll();
    default:
      throw new AppError(
        "error.notification.invalid_target",
        StatusCodes.BAD_REQUEST
      );
  }
}

export function formatNotificationPayload(
  notification: Notification
): NotificationPayload {
  return {
    id: notification.id,
    type: notification.type,
    priority: notification.priority,
    titleFrench: notification.titleFrench,
    bodyFrench: notification.bodyFrench,
    titleEnglish: notification.titleEnglish,
    bodyEnglish: notification.bodyEnglish,
    data: notification.data as Record<string, unknown> | null,
    actionUrl: notification.actionUrl,
    refTable: notification.refTable,
    refId: notification.refId,
    groupKey: notification.groupKey,
    createdAt: notification.createdAt.toISOString(),
  };
}

async function send(input: CreateNotificationInput): Promise<Notification[]> {
  const recipientIds = await resolveRecipients(input.target);

  if (recipientIds.length === 0) {
    console.warn(
      "[NotificationService] No valid recipients found for notification"
    );
    return [];
  }

  if (recipientIds.length > MAX_BATCH_SIZE) {
    console.warn(
      `[NotificationService] Recipient count (${recipientIds.length}) exceeds max batch size (${MAX_BATCH_SIZE}). Truncating.`
    );
  }

  const targetRecipients = recipientIds.slice(0, MAX_BATCH_SIZE);

  const notifications = await prisma.$transaction(
    targetRecipients.map((recipientId) =>
      prisma.notification.create({
        data: {
          type: input.type,
          priority: input.priority ?? NotificationPriority.NORMAL,
          recipientId,
          titleEnglish: input.titleEnglish,
          titleFrench: input.titleFrench,
          bodyEnglish: input.bodyEnglish,
          bodyFrench: input.bodyFrench,
          data: input.data
            ? (input.data as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          actionUrl: input.actionUrl,
          refTable: input.refTable,
          refId: input.refId,
          groupKey: input.groupKey,
          expiresAt: input.expiresAt,
          status: NotificationStatus.PENDING,
        },
      })
    )
  );

  console.log(
    `[NotificationService] Created ${notifications.length} notification(s) of type ${input.type}`
  );

  return notifications;
}

async function getForUser(
  userId: string,
  options: GetNotificationsOptions = {}
): Promise<NotificationListResponse> {
  const limit = Math.min(options.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  const where: Prisma.NotificationWhereInput = {
    recipientId: userId,
    ...(options.status && { status: { in: options.status } }),
    ...(options.type && { type: { in: options.type } }),
    ...(options.priority && { priority: { in: options.priority } }),
    ...(options.since && { createdAt: { gt: options.since } }),
    ...(options.cursor && { id: { lt: options.cursor } }),
  };

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  const hasMore = notifications.length > limit;
  const resultNotifications = hasMore
    ? notifications.slice(0, limit)
    : notifications;
  const cursor =
    resultNotifications.length > 0
      ? resultNotifications[resultNotifications.length - 1].id
      : null;

  const unreadCount = await getUnreadCount(userId);

  return {
    notifications: resultNotifications,
    cursor,
    hasMore,
    unreadCount,
  };
}

async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      recipientId: userId,
      status: {
        in: [NotificationStatus.PENDING, NotificationStatus.DELIVERED],
      },
      readAt: null,
    },
  });
}

async function getSince(
  userId: string,
  timestamp: Date
): Promise<Notification[]> {
  return prisma.notification.findMany({
    where: {
      recipientId: userId,
      createdAt: { gt: timestamp },
    },
    orderBy: { createdAt: "asc" },
    take: MAX_PAGE_SIZE,
  });
}

async function markAsRead(
  notificationId: string,
  userId: string
): Promise<Notification> {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      recipientId: userId,
    },
  });

  if (!notification) {
    throw new AppError("error.notification.not_found", StatusCodes.NOT_FOUND);
  }

  if (notification.readAt) {
    return notification;
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: NotificationStatus.READ,
      readAt: new Date(),
    },
  });
}

async function markAllAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      recipientId: userId,
      readAt: null,
    },
    data: {
      status: NotificationStatus.READ,
      readAt: new Date(),
    },
  });

  return result.count;
}

async function markAsDelivered(
  notificationId: string,
  channel: DeliveryChannel = DeliveryChannel.SOCKET
): Promise<Notification | null> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    console.warn(
      `[NotificationService] Cannot mark as delivered - notification ${notificationId} not found`
    );
    return null;
  }

  if (notification.status !== NotificationStatus.PENDING) {
    return notification;
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: NotificationStatus.DELIVERED,
      deliveredAt: new Date(),
      deliveredVia: channel,
    },
  });
}

async function dismiss(
  notificationId: string,
  userId: string
): Promise<Notification> {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      recipientId: userId,
    },
  });

  if (!notification) {
    throw new AppError("error.notification.not_found", StatusCodes.NOT_FOUND);
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: NotificationStatus.EXPIRED,
      expiresAt: new Date(),
    },
  });
}

async function getById(
  notificationId: string,
  userId: string
): Promise<Notification | null> {
  return prisma.notification.findFirst({
    where: {
      id: notificationId,
      recipientId: userId,
    },
  });
}

async function getByReference(
  refTable: string,
  refId: string,
  userId?: string
): Promise<Notification[]> {
  return prisma.notification.findMany({
    where: {
      refTable,
      refId,
      ...(userId && { recipientId: userId }),
    },
    orderBy: { createdAt: "desc" },
  });
}

async function cancelByReference(
  refTable: string,
  refId: string
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      refTable,
      refId,
      status: NotificationStatus.PENDING,
    },
    data: {
      status: NotificationStatus.EXPIRED,
      expiresAt: new Date(),
    },
  });

  return result.count;
}

export const NotificationService = {
  resolveRecipients,
  resolveByUser,
  resolveByUsers,
  resolveByRole,
  resolveByPermission,
  resolveByDepartment,
  resolveAll,

  send,
  getForUser,
  getUnreadCount,
  getSince,
  markAsRead,
  markAllAsRead,
  markAsDelivered,
  dismiss,

  getById,
  getByReference,
  cancelByReference,
  formatNotificationPayload,
};

export default NotificationService;
