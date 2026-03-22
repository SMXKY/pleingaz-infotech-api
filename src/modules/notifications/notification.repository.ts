import { FilterParams } from "@appTypes/base.types";
import prisma from "@models/index.model";
import { BaseRepository } from "src/base/BaseRepository";
import { Notification } from "src/generated/prisma";

export class NotificationRepository extends BaseRepository<Notification> {
  protected modelName = "Notification";
  protected hasSystemField = true;

  protected buildWhereClause(filters: FilterParams): Record<string, any> {
    const where: Record<string, any> = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === "") continue;

      if (typeof value === "string" && !this.isUuid(value)) {
        where[key] = { contains: value, mode: "insensitive" };
      } else {
        where[key] = value;
      }
    }

    return where;
  }
}
