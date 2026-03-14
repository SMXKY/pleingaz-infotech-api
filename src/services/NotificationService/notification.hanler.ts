import { Socket } from "socket.io";
import NotificationService, {
  formatNotificationPayload,
} from "@services/NotificationService";
import { DeliveryChannel } from "src/generated/prisma";

interface SocketUserData {
  user: {
    id: string;
    email: string;
    roleId: string | null;
    departmentId: string | null;
  };
}

export async function handleNotificationSync(
  socket: Socket & { data: SocketUserData },
  payload: { since: string }
): Promise<void> {
  const { user } = socket.data;

  try {
    const sinceDate = new Date(payload.since);

    if (isNaN(sinceDate.getTime())) {
      console.warn(`[Socket.IO] Invalid sync timestamp from user ${user.id}`);
      return;
    }

    const missed = await NotificationService.getSince(user.id, sinceDate);

    console.log(
      `[Socket.IO] Syncing ${missed.length} notifications for user ${user.id} since ${payload.since}`
    );

    for (const notification of missed) {
      socket.emit("notification:new", formatNotificationPayload(notification));
    }

    const unreadCount = await NotificationService.getUnreadCount(user.id);
    socket.emit("notification:count", { unread: unreadCount });
  } catch (error) {
    console.error(`[Socket.IO] Sync error for user ${user.id}:`, error);
  }
}

export async function handleNotificationAck(
  socket: Socket & { data: SocketUserData },
  payload: { id: string }
): Promise<void> {
  const { user } = socket.data;

  try {
    await NotificationService.markAsDelivered(
      payload.id,
      DeliveryChannel.SOCKET
    );
    console.log(
      `[Socket.IO] Notification ${payload.id} acknowledged by user ${user.id}`
    );
  } catch (error) {
    console.error(
      `[Socket.IO] Ack error for notification ${payload.id}:`,
      error
    );
  }
}

export async function handleNotificationRead(
  socket: Socket & { data: SocketUserData },
  payload: { id: string }
): Promise<void> {
  const { user } = socket.data;

  try {
    await NotificationService.markAsRead(payload.id, user.id);

    const unreadCount = await NotificationService.getUnreadCount(user.id);
    socket.emit("notification:count", { unread: unreadCount });

    console.log(
      `[Socket.IO] Notification ${payload.id} marked as read by user ${user.id}`
    );
  } catch (error) {
    console.error(
      `[Socket.IO] Read error for notification ${payload.id}:`,
      error
    );
  }
}

export async function handleNotificationReadAll(
  socket: Socket & { data: SocketUserData }
): Promise<void> {
  const { user } = socket.data;

  try {
    const count = await NotificationService.markAllAsRead(user.id);

    socket.emit("notification:count", { unread: 0 });

    console.log(
      `[Socket.IO] ${count} notifications marked as read for user ${user.id}`
    );
  } catch (error) {
    console.error(`[Socket.IO] Read all error for user ${user.id}:`, error);
  }
}

export async function sendInitialNotificationState(
  socket: Socket & { data: SocketUserData }
): Promise<void> {
  const { user } = socket.data;

  try {
    const unreadCount = await NotificationService.getUnreadCount(user.id);
    socket.emit("notification:count", { unread: unreadCount });
  } catch (error) {
    console.error(
      `[Socket.IO] Error sending initial state to user ${user.id}:`,
      error
    );

    socket.emit("notification:count", { unread: 0 });
  }
}
