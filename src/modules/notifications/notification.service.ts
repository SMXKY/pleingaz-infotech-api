import { BaseService } from "src/base/BaseService";
import { NotificationRepository } from "./notification.repository";
import {
  createNotificationSchema,
  CreateNotificationInput,
} from "./notification.schema";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import {
  FindManyOptions,
  PaginatedResult,
  ServiceContext,
} from "@appTypes/base.types";
import { Notification } from "src/generated/prisma";
import NotificationCoreService from "@services/notification";
import { Request } from "express";
import { prisma } from "src";
import { LogCategory, LogOperation } from "@appTypes/log.type";

export class NotificationService extends BaseService<
  Notification,
  CreateNotificationInput
> {
  protected repository: NotificationRepository;
  protected tableName = "notifications";
  protected createSchema = createNotificationSchema;

  constructor() {
    super();
    this.repository = new NotificationRepository();
  }

  protected async beforeCreate(
    data: CreateNotificationInput,
    ctx: ServiceContext
  ): Promise<CreateNotificationInput> {
    return data;
  }

  protected async beforeDelete(id: string, ctx: ServiceContext): Promise<void> {
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new AppError(
        "error.notifications.not_found",
        StatusCodes.NOT_FOUND
      );
    }

    if (!notification.readAt) {
      throw new AppError(
        "error.notifications.cant_delete_unread_notification",
        StatusCodes.FORBIDDEN
      );
    }
  }

  async delete(
    id: string,
    ctx: ServiceContext,
    soft: boolean = true
  ): Promise<Notification> {
    if (soft) {
      return this.repository.softDelete(id);
    }
    return this.repository.delete(id);
  }

  async findMany(
    options: FindManyOptions = {},
    ctx: ServiceContext
  ): Promise<PaginatedResult<Notification>> {
    options.filters = {
      ...(options.filters || {}),
      recipientId: ctx.userId,
    };

    return this.repository.findMany(options);
  }

  async unReadCount(ctx: ServiceContext): Promise<number> {
    if (!ctx.userId) {
      throw new AppError(
        "error.auth.user_id_missing",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    return NotificationCoreService.getUnreadCount(ctx.userId);
  }

  async findByIdForUser(
    id: string,
    ctx: ServiceContext
  ): Promise<Notification> {
    if (!ctx.userId) {
      throw new AppError(
        "error.auth.user_id_missing",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    return this.repository.findByIdOrThrow(id, {
      where: { recipientId: ctx.userId },
    });
  }

  async markOneAsRead(
    id: string,
    ctx: ServiceContext
  ): Promise<{ message: string }> {
    if (!ctx.userId || !ctx.req) {
      throw new AppError(
        "error.auth.user_id_missing",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    await NotificationCoreService.markAsRead(id, ctx.userId);

    this.log(ctx.req as Request, {
      operation: LogOperation.UPDATE,
      category: LogCategory.WRITE,
      recordId: id,
      previousState: { readAt: null },
      newState: { readAt: Date.now() },
      changedFields: ["readAt"],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return {
      message: "success.notification.notification_marked_as_read",
    };
  }

  async markAllAsRead(
    ctx: ServiceContext
  ): Promise<{ message: string; numberOfNotificationsRead: number }> {
    if (!ctx.userId) {
      throw new AppError(
        "error.auth.user_id_missing",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const numberOfNotificationsRead =
      await NotificationCoreService.markAllAsRead(ctx.userId);

    this.log(ctx.req as Request, {
      operation: LogOperation.UPDATE,
      category: LogCategory.WRITE,
      recordId: "",
      previousState: null,
      newState: {
        message: `Marked ${numberOfNotificationsRead} notifications as read`,
      },
      changedFields: ["readAt"],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return {
      message: "success.notification.all_notifications_marked_as_read",
      numberOfNotificationsRead,
    };
  }
}
