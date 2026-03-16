import { BaseRepository } from "src/base/BaseRepository";
import { SupplierPaymentMethod } from "src/generated/prisma";

export class SupplierPaymentMethodRepository extends BaseRepository<SupplierPaymentMethod> {
  protected modelName = "supplierPaymentMethod";

  async findAllBySupplier(
    supplierId: string
  ): Promise<SupplierPaymentMethod[]> {
    return this.model.findMany({
      where: { supplierId, deletedAt: null },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
  }

  async findByIdAndSupplier(
    methodId: string,
    supplierId: string
  ): Promise<SupplierPaymentMethod | null> {
    return this.model.findFirst({
      where: { id: methodId, supplierId, deletedAt: null },
    });
  }

  async countActive(supplierId: string): Promise<number> {
    return this.model.count({
      where: { supplierId, deletedAt: null },
    });
  }

  async unsetDefault(supplierId: string): Promise<void> {
    await this.model.updateMany({
      where: { supplierId, isDefault: true, deletedAt: null },
      data: { isDefault: false },
    });
  }

  async promoteNextDefault(
    supplierId: string,
    excludeId: string
  ): Promise<void> {
    const next = await this.model.findFirst({
      where: { supplierId, deletedAt: null, id: { not: excludeId } },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await this.model.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }
}
