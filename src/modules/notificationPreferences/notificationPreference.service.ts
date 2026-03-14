import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import { NotificationPreference, Prisma } from "src/generated/prisma";
import { prisma } from "src";
import { UpdateNotificationPreferencesInput } from "./notificationPreference.schema";
import { BaseService } from "src/base/BaseService";
import { NotificationPreferenceRepository } from "./notificationPreference.repository";

export class NotificationPreferencesService extends BaseService<
  NotificationPreference,
  UpdateNotificationPreferencesInput
> {
  protected repository: NotificationPreferenceRepository;
  protected tableName = "notification_preferences";

  constructor() {
    super();
    this.repository = new NotificationPreferenceRepository();
  }

  async get(ctx: ServiceContext): Promise<NotificationPreference> {
    if (!ctx.userId) {
      throw new AppError(
        "error.auth.user_id_missing",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId: ctx.userId },
    });

    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId: ctx.userId,
          inApp: true,
          push: true,
          email: true,
        },
      });
    }

    return preferences;
  }

  async updatePreference(
    data: UpdateNotificationPreferencesInput,
    ctx: ServiceContext
  ): Promise<NotificationPreference> {
    if (!ctx.userId) {
      throw new AppError(
        "error.auth.user_id_missing",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const existing = await prisma.notificationPreference.findUnique({
      where: { userId: ctx.userId },
    });

    const updateData: Prisma.NotificationPreferenceUpdateInput = {};

    if (data.inApp !== undefined) updateData.inApp = data.inApp;
    if (data.push !== undefined) updateData.push = data.push;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.quietStart !== undefined) updateData.quietStart = data.quietStart;
    if (data.quietEnd !== undefined) updateData.quietEnd = data.quietEnd;
    if (data.typeOverrides !== undefined) {
      updateData.typeOverrides = data.typeOverrides as Prisma.InputJsonValue;
    }

    if (existing) {
      return prisma.notificationPreference.update({
        where: { userId: ctx.userId },
        data: updateData,
      });
    }

    return prisma.notificationPreference.create({
      data: {
        userId: ctx.userId,
        inApp: data.inApp ?? true,
        push: data.push ?? true,
        email: data.email ?? true,
        quietStart: data.quietStart,
        quietEnd: data.quietEnd,
        typeOverrides: data.typeOverrides as Prisma.InputJsonValue,
      },
    });
  }

  async reset(ctx: ServiceContext): Promise<NotificationPreference> {
    if (!ctx.userId) {
      throw new AppError(
        "error.auth.user_id_missing",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    return prisma.notificationPreference.upsert({
      where: { userId: ctx.userId },
      create: {
        userId: ctx.userId,
        inApp: true,
        push: true,
        email: true,
      },
      update: {
        inApp: true,
        push: true,
        email: true,
        quietStart: null,
        quietEnd: null,
        typeOverrides: Prisma.JsonNull,
      },
    });
  }
}
