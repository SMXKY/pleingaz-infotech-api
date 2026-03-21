import { BaseRepository } from "src/base/BaseRepository";
import { GasBottlePurchaseOrder } from "src/generated/prisma";
import { FilterParams } from "@appTypes/base.types";

export class GasBottlePurchaseOrderRepository extends BaseRepository<GasBottlePurchaseOrder> {
  protected modelName = "gasBottlePurchaseOrder";
  protected hasSystemField = false;

  async findByReference(
    reference: string
  ): Promise<GasBottlePurchaseOrder | null> {
    return this.model.findFirst({
      where: { reference, deletedAt: null },
    });
  }

  protected buildWhereClause(filters: FilterParams): Record<string, any> {
    const where: Record<string, any> = { deletedAt: null };

    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === "") continue;

      if (key === "status" || key === "paymentStatus") {
        where[key] = value;
      } else if (
        key === "supplierId" ||
        key === "depotId" ||
        key === "createdById"
      ) {
        where[key] = value;
      } else if (typeof value === "string" && !this.isUuid(value)) {
        where[key] = { contains: value, mode: "insensitive" };
      } else {
        where[key] = value;
      }
    }

    return where;
  }
}
