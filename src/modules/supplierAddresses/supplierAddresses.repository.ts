import { BaseRepository } from "src/base/BaseRepository";
import { SupplierAddress, SupplierAddressType } from "src/generated/prisma";

export class SupplierAddressRepository extends BaseRepository<SupplierAddress> {
  protected modelName = "supplierAddress";

  async findAllBySupplier(supplierId: string): Promise<SupplierAddress[]> {
    return this.model.findMany({
      where: { supplierId, deletedAt: null },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
  }

  async findByIdAndSupplier(
    addressId: string,
    supplierId: string
  ): Promise<SupplierAddress | null> {
    return this.model.findFirst({
      where: { id: addressId, supplierId, deletedAt: null },
    });
  }

  async countActive(supplierId: string): Promise<number> {
    return this.model.count({
      where: { supplierId, deletedAt: null },
    });
  }

  async unsetDefaultByType(
    supplierId: string,
    addressType: SupplierAddressType
  ): Promise<void> {
    await this.model.updateMany({
      where: {
        supplierId,
        addressType,
        isDefault: true,
        deletedAt: null,
      },
      data: { isDefault: false },
    });
  }

  async promoteNextDefault(
    supplierId: string,
    addressType: SupplierAddressType,
    excludeId: string
  ): Promise<void> {
    const next = await this.model.findFirst({
      where: {
        supplierId,
        addressType,
        deletedAt: null,
        id: { not: excludeId },
      },
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
