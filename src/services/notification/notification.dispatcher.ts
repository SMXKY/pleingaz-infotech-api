import {
  Notification,
  NotificationPriority,
  NotificationStatus,
  DeliveryChannel,
} from "src/generated/prisma";
import prisma from "@models/index.model";
import { isUserOnline } from "src/socket/socket";
import NotificationService, {
  formatNotificationPayload,
} from "@services/nofication";
import FCMService from "@services/fcm/fcm.service";

export interface DispatchResult {
  notificationId: string;
  success: boolean;
  channel: DeliveryChannel | null;
  error?: string;
}

export interface DispatchOptions {
  skipSocket?: boolean;
  skipPush?: boolean;
  forceChannel?: DeliveryChannel;
}

async function dispatchViaSocket(notification: Notification): Promise<boolean> {
  const userId = notification.recipientId;

  const online = await isUserOnline(userId);
  if (!online) {
    return false;
  }

  const { emitToUser } = await import("src/socket/socket");

  const payload = formatNotificationPayload(notification);
  emitToUser(userId, "notification:new", payload);

  const unreadCount = await NotificationService.getUnreadCount(userId);
  emitToUser(userId, "notification:count", { unread: unreadCount });

  console.log(
    `[NotificationDispatcher] Delivered via Socket.IO to user ${userId}`
  );

  return true;
}

async function dispatchViaPush(notification: Notification): Promise<boolean> {
  if (!FCMService.isFirebaseReady()) {
    console.warn("[NotificationDispatcher] FCM not available - skipping push");
    return false;
  }

  const result = await FCMService.sendPushToUser(
    notification,
    notification.recipientId
  );

  if (result.success) {
    console.log(
      `[NotificationDispatcher] Delivered via FCM to ${result.successCount} device(s)`
    );
  }

  return result.success;
}

async function selectDeliveryChannel(
  notification: Notification,
  options: DispatchOptions = {}
): Promise<DeliveryChannel | null> {
  if (options.forceChannel) {
    return options.forceChannel;
  }

  const userId = notification.recipientId;
  const isOnline = await isUserOnline(userId);

  if (isOnline && !options.skipSocket) {
    return DeliveryChannel.SOCKET;
  }

  if (!options.skipPush) {
    const tokens = await FCMService.getMobileTokensForUser(userId);
    if (tokens.length > 0) {
      return DeliveryChannel.FCM;
    }
  }

  if (notification.priority === NotificationPriority.URGENT) {
    return DeliveryChannel.EMAIL;
  }

  return null;
}

async function updateDeliveryStatus(
  notificationId: string,
  channel: DeliveryChannel,
  success: boolean,
  error?: string
): Promise<void> {
  if (success) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.DELIVERED,
        deliveredAt: new Date(),
        deliveredVia: channel,
      },
    });
  } else {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        attempts: { increment: 1 },
        lastError: error ?? "Delivery failed",
      },
    });
  }
}

export async function dispatch(
  notification: Notification,
  options: DispatchOptions = {}
): Promise<DispatchResult> {
  const { id: notificationId, recipientId } = notification;

  try {
    const channel = await selectDeliveryChannel(notification, options);

    if (!channel) {
      console.log(
        `[NotificationDispatcher] No immediate channel for notification ${notificationId} - staying PENDING`
      );
      return {
        notificationId,
        success: false,
        channel: null,
        error: "No delivery channel available",
      };
    }

    let success = false;

    switch (channel) {
      case DeliveryChannel.SOCKET:
        success = await dispatchViaSocket(notification);

        if (!success && !options.skipPush) {
          success = await dispatchViaPush(notification);
          if (success) {
            await updateDeliveryStatus(
              notificationId,
              DeliveryChannel.FCM,
              true
            );
            return {
              notificationId,
              success: true,
              channel: DeliveryChannel.FCM,
            };
          }
        }
        break;

      case DeliveryChannel.FCM:
        success = await dispatchViaPush(notification);
        break;

      case DeliveryChannel.EMAIL:
        console.log(
          `[NotificationDispatcher] Notification ${notificationId} queued for email fallback`
        );
        return {
          notificationId,
          success: false,
          channel: DeliveryChannel.EMAIL,
          error: "Queued for email fallback",
        };
    }

    await updateDeliveryStatus(notificationId, channel, success);

    if (success) {
      return { notificationId, success: true, channel };
    }

    return {
      notificationId,
      success: false,
      channel,
      error: "Delivery attempt failed",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[NotificationDispatcher] Error dispatching ${notificationId}:`,
      error
    );

    await updateDeliveryStatus(
      notificationId,
      DeliveryChannel.SOCKET,
      false,
      errorMessage
    );

    return {
      notificationId,
      success: false,
      channel: null,
      error: errorMessage,
    };
  }
}

export async function dispatchBatch(
  notifications: Notification[],
  options: DispatchOptions = {}
): Promise<DispatchResult[]> {
  const results = await Promise.all(
    notifications.map((notification) => dispatch(notification, options))
  );

  const successCount = results.filter((r) => r.success).length;
  console.log(
    `[NotificationDispatcher] Batch complete: ${successCount}/${notifications.length} delivered`
  );

  return results;
}

export async function sendAndDispatch(
  input: Parameters<typeof NotificationService.send>[0]
): Promise<{
  notifications: Notification[];
  results: DispatchResult[];
}> {
  const notifications = await NotificationService.send(input);

  if (notifications.length === 0) {
    return { notifications: [], results: [] };
  }

  const results = await dispatchBatch(notifications);

  return { notifications, results };
}

const MAX_RETRY_ATTEMPTS = 4;
const RETRY_DELAYS = [1000, 5000, 30000, 300000];

export async function retryDispatch(
  notificationId: string
): Promise<DispatchResult> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    return {
      notificationId,
      success: false,
      channel: null,
      error: "Notification not found",
    };
  }

  if (notification.attempts >= MAX_RETRY_ATTEMPTS) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.FAILED,
        lastError: "Max retry attempts exceeded",
      },
    });

    return {
      notificationId,
      success: false,
      channel: null,
      error: "Max retry attempts exceeded",
    };
  }

  return dispatch(notification);
}

export function getRetryDelay(attempts: number): number {
  return RETRY_DELAYS[Math.min(attempts, RETRY_DELAYS.length - 1)];
}

export const NotificationDispatcher = {
  dispatch,
  dispatchBatch,
  sendAndDispatch,
  retryDispatch,
  getRetryDelay,

  dispatchViaSocket,
  dispatchViaPush,
  selectDeliveryChannel,
};

export default NotificationDispatcher;
