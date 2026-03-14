import { BaseService } from "src/base/BaseService";
import { DeviceTokenRepository } from "./deviceToken.repository";
import {
  createDeviceTokenSchema,
  CreateDeviceTokenInput,
} from "./deviceToken.schema";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import { DeviceToken, Platform } from "src/generated/prisma";
import { prisma } from "src";

export class DeviceTokenService extends BaseService<
  DeviceToken,
  CreateDeviceTokenInput
> {
  protected repository: DeviceTokenRepository;
  protected tableName = "device_tokens";
  protected createSchema = createDeviceTokenSchema;

  constructor() {
    super();
    this.repository = new DeviceTokenRepository();
  }

  protected async beforeCreate(
    data: CreateDeviceTokenInput,
    ctx: ServiceContext
  ): Promise<CreateDeviceTokenInput> {
    return data;
  }

  async register(
    data: CreateDeviceTokenInput,
    ctx: ServiceContext
  ): Promise<DeviceToken> {
    if (!ctx.userId) {
      throw new AppError(
        "error.auth.user_id_missing",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const record = await prisma.deviceToken.upsert({
      where: { token: data.token },
      create: {
        userId: ctx.userId,
        token: data.token,
        deviceName: data.deviceName,
        platform: data.platform as Platform,
        isActive: true,
        lastUsedAt: new Date(),
      },
      update: {
        userId: ctx.userId,
        deviceName: data.deviceName,
        platform: data.platform as Platform,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });

    return record;
  }

  async deactivate(token: string, ctx: ServiceContext): Promise<boolean> {
    if (!ctx.userId) {
      throw new AppError(
        "error.auth.user_id_missing",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const existing = await prisma.deviceToken.findUnique({
      where: { token },
    });

    if (!existing) {
      return false;
    }

    if (existing.userId !== ctx.userId) {
      throw new AppError("error.auth.unauthorized", StatusCodes.FORBIDDEN);
    }

    await prisma.deviceToken.update({
      where: { token },
      data: { isActive: false },
    });

    return true;
  }

  async getMyTokens(ctx: ServiceContext): Promise<DeviceToken[]> {
    if (!ctx.userId) {
      throw new AppError(
        "error.auth.user_id_missing",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    return prisma.deviceToken.findMany({
      where: {
        userId: ctx.userId,
        isActive: true,
      },
      orderBy: { lastUsedAt: "desc" },
    });
  }

  async deactivateAll(ctx: ServiceContext): Promise<number> {
    if (!ctx.userId) {
      throw new AppError(
        "error.auth.user_id_missing",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const result = await prisma.deviceToken.updateMany({
      where: {
        userId: ctx.userId,
        isActive: true,
      },
      data: { isActive: false },
    });

    return result.count;
  }
}
