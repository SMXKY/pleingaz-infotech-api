import {
  FilterParams,
  FindManyOptions,
  PaginatedResult,
} from "@appTypes/base.types";
import prisma from "@models/index.model";
import { BaseRepository } from "src/base/BaseRepository";
import { ActivityLog } from "src/generated/prisma";

export class ActivityLogRepository extends BaseRepository<ActivityLog> {
  protected modelName = "ActivityLog";
  protected hasSystemField = true;

  async findByCode(code: string): Promise<ActivityLog | null> {
    return this.model.findFirst({
      where: { code, deletedAt: null },
    });
  }

  async findWildCardActivityLogs(): Promise<ActivityLog[]> {
    return this.model.findMany({
      where: { isWildcard: true, deletedAt: null },
    });
  }

  protected override buildWhereClause(
    filters: FilterParams
  ): Record<string, any> {
    const where: Record<string, any> = {}; // no deletedAt filter

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
  async findDeleted(
    options: FindManyOptions = {}
  ): Promise<PaginatedResult<ActivityLog>> {
    return super.findDeleted({
      ...options,
      pagination: {
        sortBy: "createdAt",
        ...options.pagination,
      },
    });
  }
}
