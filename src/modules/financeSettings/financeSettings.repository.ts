import {
  FilterParams,
  FindManyOptions,
  PaginatedResult,
} from "@appTypes/base.types";
import prisma from "@models/index.model";
import { BaseRepository } from "src/base/BaseRepository";
import { AdminConfig } from "src/generated/prisma";

export class AdminConfigRepository extends BaseRepository<AdminConfig> {
  protected modelName = "AdminConfig";
  protected hasSystemField = true;

  async findByCode(code: string): Promise<AdminConfig | null> {
    return this.model.findFirst({
      where: { code, deletedAt: null },
    });
  }

  async findWildCardAdminConfigs(): Promise<AdminConfig[]> {
    return this.model.findMany({
      where: { isWildcard: true, deletedAt: null },
    });
  }

  protected override buildWhereClause(
    filters: FilterParams
  ): Record<string, any> {
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

  async findDeleted(
    options: FindManyOptions = {}
  ): Promise<PaginatedResult<AdminConfig>> {
    return super.findDeleted({
      ...options,
      pagination: {
        sortBy: "createdAt",
        ...options.pagination,
      },
    });
  }
}
