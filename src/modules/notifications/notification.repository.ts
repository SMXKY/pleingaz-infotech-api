import prisma from "@models/index.model";
import { BaseRepository } from "src/base/BaseRepository";
import { Notification } from "src/generated/prisma";

export class NotificationRepository extends BaseRepository<Notification> {
  protected modelName = "Notification";
  protected hasSystemField = true;

  async findByName(name: string): Promise<Notification | null> {
    return this.model.findFirst({
      where: { name, deletedAt: null },
    });
  }

  async findActiveNotifications(): Promise<Notification[]> {
    return this.model.findMany({
      where: { isActive: true, deletedAt: null },
    });
  }
}
