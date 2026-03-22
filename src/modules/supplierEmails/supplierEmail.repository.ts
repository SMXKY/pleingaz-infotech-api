import { FilterParams } from "@appTypes/base.types";
import { BaseRepository } from "src/base/BaseRepository";
import { OrderEmail } from "src/generated/prisma";

export class OrderEmailRepository extends BaseRepository<OrderEmail> {
  protected modelName = "orderEmail";
  protected hasSystemField = false;

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

  protected addSoftDeleteFilter(
    where: Partial<OrderEmail>
  ): Record<string, any> {
    return { ...where };
  }

  async findById(
    id: string,
    include?: Record<string, boolean | object>
  ): Promise<OrderEmail | null> {
    return this.model.findUnique({
      where: { id },
      include,
    });
  }
}
