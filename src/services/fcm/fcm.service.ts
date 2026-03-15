import * as admin from "firebase-admin";
import prisma from "@models/index.model";
import {
  Notification,
  NotificationPriority,
  Platform,
} from "src/generated/prisma";
import {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} from "@utils/enviromentVariablesCheck.util";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";

export interface FCMSendResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  failedTokens: string[];
  errors: string[];
}

export interface FCMNotificationPayload {
  titleFrench: string;
  bodyFrench: string;
  titleEnglish: string;
  bodyEnglish: string;
}

export interface FCMDataPayload {
  notificationId: string;
  type: string;
  priority: string;
  actionUrl?: string;
  refTable?: string;
  refId?: string;
  payload?: string;
  [key: string]: string | undefined;
}

export interface DeviceTokenInfo {
  token: string;
  platform: Platform;
  userId: string;
}

let firebaseApp: admin.app.App | null = null;
let initializationAttempted = false;

export function isFirebaseConfigured(): boolean {
  return !!(
    FIREBASE_PROJECT_ID &&
    FIREBASE_CLIENT_EMAIL &&
    FIREBASE_PRIVATE_KEY
  );
}

export function initializeFirebase(): boolean {
  if (firebaseApp) {
    return true;
  }

  if (initializationAttempted) {
    return false;
  }

  initializationAttempted = true;

  if (!isFirebaseConfigured()) {
    console.warn(
      "[FCMService] Firebase credentials not configured. Push notifications disabled."
    );
    console.warn(
      "[FCMService] Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY to enable."
    );
    return false;
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      }),
    });

    console.log("[FCMService] Firebase Admin SDK initialized successfully");
    return true;
  } catch (error) {
    console.error("[FCMService] Firebase initialization failed:", error);
    return false;
  }
}

export function isFirebaseReady(): boolean {
  return firebaseApp !== null;
}

function getMessaging(): admin.messaging.Messaging {
  if (!firebaseApp) {
    throw new Error(
      "Firebase not initialized. Call initializeFirebase() first."
    );
  }
  return admin.messaging();
}

export async function getActiveTokensForUser(
  userId: string
): Promise<DeviceTokenInfo[]> {
  const tokens = await prisma.deviceToken.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      token: true,
      platform: true,
      userId: true,
    },
  });

  return tokens;
}

export async function getMobileTokensForUser(
  userId: string
): Promise<string[]> {
  const tokens = await prisma.deviceToken.findMany({
    where: {
      userId,
      isActive: true,
      platform: { in: [Platform.IOS, Platform.ANDROID] },
    },
    select: { token: true },
  });

  return tokens.map((t) => t.token);
}

export async function deactivateTokens(tokens: string[]): Promise<number> {
  if (tokens.length === 0) return 0;

  const result = await prisma.deviceToken.updateMany({
    where: { token: { in: tokens } },
    data: { isActive: false },
  });

  if (result.count > 0) {
    console.log(`[FCMService] Deactivated ${result.count} invalid token(s)`);
  }

  return result.count;
}

export async function touchTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;

  await prisma.deviceToken.updateMany({
    where: { token: { in: tokens } },
    data: { lastUsedAt: new Date() },
  });
}

export async function cleanupStaleTokens(
  daysInactive: number = 30
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

  const result = await prisma.deviceToken.updateMany({
    where: {
      lastUsedAt: { lt: cutoffDate },
      isActive: true,
    },
    data: { isActive: false },
  });

  if (result.count > 0) {
    console.log(
      `[FCMService] Deactivated ${result.count} stale token(s) (inactive > ${daysInactive} days)`
    );
  }

  return result.count;
}

export function buildMessagePayload(
  notification: Notification,
  unreadCount: number = 0
): {
  notification: FCMNotificationPayload;
  data: FCMDataPayload;
  android: admin.messaging.AndroidConfig;
  apns: admin.messaging.ApnsConfig;
} {
  const isHighPriority =
    notification.priority === NotificationPriority.URGENT ||
    notification.priority === NotificationPriority.HIGH;

  return {
    notification: {
      titleFrench: notification.titleFrench,
      bodyFrench: notification.bodyFrench,
      titleEnglish: notification.titleEnglish,
      bodyEnglish: notification.bodyEnglish,
    },
    data: {
      notificationId: notification.id,
      type: notification.type,
      priority: notification.priority,
      actionUrl: notification.actionUrl ?? "",
      refTable: notification.refTable ?? "",
      refId: notification.refId ?? "",
      payload: JSON.stringify(notification.data ?? {}),
      createdAt: notification.createdAt.toISOString(),
    },
    android: {
      priority: isHighPriority ? "high" : "normal",
      notification: {
        channelId: "pleingaz_notifications",
        sound: "default",
        priority: isHighPriority ? "high" : "default",
      },
      ttl: 86400000,
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: unreadCount,
          contentAvailable: true,
        },
      },
      headers: {
        "apns-priority": isHighPriority ? "10" : "5",
        "apns-expiration": String(Math.floor(Date.now() / 1000) + 86400),
      },
    },
  };
}

export function buildSimpleMessage(
  titleFrench: string,
  bodyFrench: string,
  titleEnglish: string,
  bodyEnglish: string,
  data?: Record<string, string>
): {
  notification: FCMNotificationPayload;
  data?: Record<string, string>;
} {
  return {
    notification: { titleEnglish, titleFrench, bodyEnglish, bodyFrench },
    ...(data && { data }),
  };
}

function sanitizeFCMData(data: FCMDataPayload): Record<string, string> {
  const clean: Record<string, string> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }

  return clean;
}

export async function sendPush(
  notification: Notification,
  deviceTokens: string[],
  unreadCount: number = 0
): Promise<FCMSendResult> {
  if (!isFirebaseReady()) {
    console.warn("[FCMService] Firebase not ready - cannot send push");
    return {
      success: false,
      successCount: 0,
      failureCount: deviceTokens.length,
      failedTokens: deviceTokens,
      errors: ["Firebase not initialized"],
    };
  }

  if (deviceTokens.length === 0) {
    return {
      success: true,
      successCount: 0,
      failureCount: 0,
      failedTokens: [],
      errors: [],
    };
  }

  const payload = buildMessagePayload(notification, unreadCount);
  const user = await prisma.user.findUnique({
    where: {
      id: notification.recipientId,
    },
    include: {
      preference: {
        select: {
          language: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(
      "error.auth.user_id_missing",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  const isFrench = user.preference?.language === "FR";

  const cleanNotification = {
    title: isFrench ? notification.titleFrench : notification.titleEnglish,
    body: isFrench ? notification.bodyFrench : notification.bodyEnglish,
  };

  try {
    const message: admin.messaging.MulticastMessage = {
      tokens: deviceTokens,
      notification: cleanNotification,
      android: payload.android,
      apns: payload.apns,
      data: sanitizeFCMData(payload.data),
    };

    const response = await getMessaging().sendEachForMulticast(message);

    const failedTokens: string[] = [];
    const errors: string[] = [];

    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        failedTokens.push(deviceTokens[idx]);
        errors.push(`${deviceTokens[idx].slice(-8)}: ${resp.error.message}`);

        const errorCode = resp.error.code;
        if (
          errorCode === "messaging/registration-token-not-registered" ||
          errorCode === "messaging/invalid-registration-token"
        ) {
          console.log(
            `[FCMService] Token invalid/unregistered: ...${deviceTokens[
              idx
            ].slice(-8)}`
          );
        }
      }
    });

    if (failedTokens.length > 0) {
      await deactivateTokens(failedTokens);
    }

    const successfulTokens = deviceTokens.filter(
      (t) => !failedTokens.includes(t)
    );
    if (successfulTokens.length > 0) {
      await touchTokens(successfulTokens);
    }

    const result: FCMSendResult = {
      success: response.successCount > 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens,
      errors,
    };

    if (response.successCount > 0) {
      console.log(
        `[FCMService] Sent to ${response.successCount}/${deviceTokens.length} device(s)`
      );
    }

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[FCMService] Send failed:", errorMessage);

    return {
      success: false,
      successCount: 0,
      failureCount: deviceTokens.length,
      failedTokens: deviceTokens,
      errors: [errorMessage],
    };
  }
}

export async function sendPushToUser(
  notification: Notification,
  userId: string,
  unreadCount?: number
): Promise<FCMSendResult> {
  const tokens = await getMobileTokensForUser(userId);

  if (tokens.length === 0) {
    console.log(`[FCMService] No mobile tokens for user ${userId}`);
    return {
      success: false,
      successCount: 0,
      failureCount: 0,
      failedTokens: [],
      errors: ["No device tokens registered"],
    };
  }

  const badgeCount =
    unreadCount ??
    (await prisma.notification.count({
      where: {
        recipientId: userId,
        readAt: null,
        status: { in: ["PENDING", "DELIVERED"] },
      },
    }));

  return sendPush(notification, tokens, badgeCount);
}

export async function sendSimplePush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<FCMSendResult> {
  if (!isFirebaseReady()) {
    return {
      success: false,
      successCount: 0,
      failureCount: tokens.length,
      failedTokens: tokens,
      errors: ["Firebase not initialized"],
    };
  }

  if (tokens.length === 0) {
    return {
      success: true,
      successCount: 0,
      failureCount: 0,
      failedTokens: [],
      errors: [],
    };
  }

  try {
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: { title, body },
      ...(data && { data }),
    };

    const response = await getMessaging().sendEachForMulticast(message);

    const failedTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        failedTokens.push(tokens[idx]);
      }
    });

    if (failedTokens.length > 0) {
      await deactivateTokens(failedTokens);
    }

    return {
      success: response.successCount > 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens,
      errors: [],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      successCount: 0,
      failureCount: tokens.length,
      failedTokens: tokens,
      errors: [errorMessage],
    };
  }
}

export async function sendToTopic(
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  if (!isFirebaseReady()) {
    console.warn("[FCMService] Firebase not ready - cannot send to topic");
    return false;
  }

  try {
    const message: admin.messaging.Message = {
      topic,
      notification: { title, body },
      ...(data && { data }),
    };

    await getMessaging().send(message);
    console.log(`[FCMService] Sent to topic: ${topic}`);
    return true;
  } catch (error) {
    console.error(`[FCMService] Failed to send to topic ${topic}:`, error);
    return false;
  }
}

export async function subscribeToTopic(
  tokens: string[],
  topic: string
): Promise<boolean> {
  if (!isFirebaseReady() || tokens.length === 0) return false;

  try {
    await getMessaging().subscribeToTopic(tokens, topic);
    console.log(
      `[FCMService] Subscribed ${tokens.length} token(s) to topic: ${topic}`
    );
    return true;
  } catch (error) {
    console.error(`[FCMService] Topic subscription failed:`, error);
    return false;
  }
}

export async function unsubscribeFromTopic(
  tokens: string[],
  topic: string
): Promise<boolean> {
  if (!isFirebaseReady() || tokens.length === 0) return false;

  try {
    await getMessaging().unsubscribeFromTopic(tokens, topic);
    console.log(
      `[FCMService] Unsubscribed ${tokens.length} token(s) from topic: ${topic}`
    );
    return true;
  } catch (error) {
    console.error(`[FCMService] Topic unsubscription failed:`, error);
    return false;
  }
}

export const FCMService = {
  initializeFirebase,
  isFirebaseConfigured,
  isFirebaseReady,

  getActiveTokensForUser,
  getMobileTokensForUser,
  deactivateTokens,
  touchTokens,
  cleanupStaleTokens,

  buildMessagePayload,
  buildSimpleMessage,

  sendPush,
  sendPushToUser,
  sendSimplePush,
  sendToTopic,

  subscribeToTopic,
  unsubscribeFromTopic,
};

export default FCMService;
