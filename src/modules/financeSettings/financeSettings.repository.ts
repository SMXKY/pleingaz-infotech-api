import {
  FilterParams,
  FindManyOptions,
  PaginatedResult,
} from "@appTypes/base.types";
import { BaseRepository } from "src/base/BaseRepository";
import { FinanceSettings } from "src/generated/prisma";

export class FinanceSettingsRepository extends BaseRepository<FinanceSettings> {
  protected modelName = "FinanceSettings";
  protected hasSystemField = true;

  async findByCode(code: string): Promise<FinanceSettings | null> {
    return this.model.findFirst({
      where: { code, deletedAt: null },
    });
  }

  async findWildCardFinanceSettingss(): Promise<FinanceSettings[]> {
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
  ): Promise<PaginatedResult<FinanceSettings>> {
    return super.findDeleted({
      ...options,
      pagination: {
        sortBy: "createdAt",
        ...options.pagination,
      },
    });
  }

  protected addSoftDeleteFilter(
    where: Partial<FinanceSettings>
  ): Record<string, any> {
    return { ...where };
  }

  async findById(
    id: string,
    include?: Record<string, boolean | object>
  ): Promise<FinanceSettings | null> {
    return this.model.findUnique({
      where: { id },
      include,
    });
  }
}
