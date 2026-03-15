import { FilterParams } from "@appTypes/base.types";
import { BaseRepository } from "src/base/BaseRepository";
import { ExchangeRate } from "src/generated/prisma";

export class ExchangeRateRepository extends BaseRepository<ExchangeRate> {
  protected modelName = "ExchangeRate";
  protected hasSystemField = true;

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
}
