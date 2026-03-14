import prisma from "@models/index.model";
import { DeviceToken, Platform } from "src/generated/prisma";

export interface RegisterTokenInput {
  token: string;
  platform: Platform;
  deviceName?: string;
}

export interface DeviceTokenInfo {
  id: string;
  token: string;
  platform: Platform;
  deviceName: string | null;
  isActive: boolean;
  lastUsedAt: Date;
  createdAt: Date;
}

async function register(
  userId: string,
  input: RegisterTokenInput
): Promise<DeviceToken> {
  const { token, platform, deviceName } = input;

  const existing = await prisma.deviceToken.findUnique({
    where: { token },
  });

  if (existing) {
    return prisma.deviceToken.update({
      where: { token },
      data: {
        userId,
        platform,
        deviceName: deviceName ?? existing.deviceName,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });
  }

  return prisma.deviceToken.create({
    data: {
      userId,
      token,
      platform,
      deviceName,
      isActive: true,
      lastUsedAt: new Date(),
    },
  });
}

async function deactivate(token: string): Promise<boolean> {
  const existing = await prisma.deviceToken.findUnique({
    where: { token },
  });

  if (!existing) {
    return false;
  }

  await prisma.deviceToken.update({
    where: { token },
    data: { isActive: false },
  });

  return true;
}

async function deactivateAllForUser(userId: string): Promise<number> {
  const result = await prisma.deviceToken.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  });

  return result.count;
}

async function getActiveTokens(userId: string): Promise<DeviceTokenInfo[]> {
  const tokens = await prisma.deviceToken.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      id: true,
      token: true,
      platform: true,
      deviceName: true,
      isActive: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { lastUsedAt: "desc" },
  });

  return tokens;
}

async function getAllTokens(userId: string): Promise<DeviceTokenInfo[]> {
  const tokens = await prisma.deviceToken.findMany({
    where: { userId },
    select: {
      id: true,
      token: true,
      platform: true,
      deviceName: true,
      isActive: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { lastUsedAt: "desc" },
  });

  return tokens;
}

async function getMobileTokens(userId: string): Promise<string[]> {
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

async function cleanupStaleTokens(daysInactive: number = 30): Promise<number> {
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
      `[DeviceTokenService] Deactivated ${result.count} stale token(s) (inactive > ${daysInactive} days)`
    );
  }

  return result.count;
}

async function deleteInactiveTokens(
  daysInactive: number = 90
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

  const result = await prisma.deviceToken.deleteMany({
    where: {
      isActive: false,
      lastUsedAt: { lt: cutoffDate },
    },
  });

  if (result.count > 0) {
    console.log(
      `[DeviceTokenService] Deleted ${result.count} inactive token(s) (inactive > ${daysInactive} days)`
    );
  }

  return result.count;
}

async function touch(token: string): Promise<boolean> {
  const existing = await prisma.deviceToken.findUnique({
    where: { token },
  });

  if (!existing) {
    return false;
  }

  await prisma.deviceToken.update({
    where: { token },
    data: { lastUsedAt: new Date() },
  });

  return true;
}

async function touchMany(tokens: string[]): Promise<number> {
  if (tokens.length === 0) return 0;

  const result = await prisma.deviceToken.updateMany({
    where: { token: { in: tokens } },
    data: { lastUsedAt: new Date() },
  });

  return result.count;
}

async function deactivateMany(tokens: string[]): Promise<number> {
  if (tokens.length === 0) return 0;

  const result = await prisma.deviceToken.updateMany({
    where: { token: { in: tokens } },
    data: { isActive: false },
  });

  return result.count;
}

async function getByToken(token: string): Promise<DeviceToken | null> {
  return prisma.deviceToken.findUnique({
    where: { token },
  });
}

async function deleteByToken(token: string): Promise<boolean> {
  const existing = await prisma.deviceToken.findUnique({
    where: { token },
  });

  if (!existing) {
    return false;
  }

  await prisma.deviceToken.delete({
    where: { token },
  });

  return true;
}

async function countActiveTokens(userId: string): Promise<number> {
  return prisma.deviceToken.count({
    where: {
      userId,
      isActive: true,
    },
  });
}

export const DeviceTokenService = {
  register,
  deactivate,
  deactivateAllForUser,
  getActiveTokens,
  getAllTokens,
  getMobileTokens,
  cleanupStaleTokens,
  deleteInactiveTokens,
  touch,
  touchMany,
  deactivateMany,
  getByToken,
  deleteByToken,
  countActiveTokens,
};

export default DeviceTokenService;
