import { BaseRepository } from "src/base/BaseRepository";
import { SupplierContact } from "src/generated/prisma";
import { TransactionClient } from "../users/utilities/generateEmployeeId.util";

export class SupplierContactRepository extends BaseRepository<SupplierContact> {
  protected modelName = "supplierContact";

  async findAllBySupplier(supplierId: string): Promise<SupplierContact[]> {
    return this.model.findMany({
      where: { supplierId, deletedAt: null },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
  }

  async findByIdAndSupplier(
    contactId: string,
    supplierId: string
  ): Promise<SupplierContact | null> {
    return this.model.findFirst({
      where: { id: contactId, supplierId, deletedAt: null },
    });
  }

  async countActive(supplierId: string): Promise<number> {
    return this.model.count({
      where: { supplierId, deletedAt: null },
    });
  }

  async findPrimary(supplierId: string): Promise<SupplierContact | null> {
    return this.model.findFirst({
      where: { supplierId, isPrimary: true, deletedAt: null },
    });
  }

  async unsetPrimary(supplierId: string): Promise<void> {
    await this.model.updateMany({
      where: { supplierId, isPrimary: true, deletedAt: null },
      data: { isPrimary: false },
    });
  }

  async promoteNextPrimary(
    supplierId: string,
    excludeId: string,
    tx: TransactionClient
  ): Promise<void> {
    await tx.supplierContact.updateMany({
      where: {
        supplierId,
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    });

    const next = await tx.supplierContact.findFirst({
      where: { supplierId, deletedAt: null, id: { not: excludeId } },
      orderBy: { createdAt: "asc" },
    });

    if (next) {
      await tx.supplierContact.update({
        where: { id: next.id },
        data: { isPrimary: true },
      });
    }
  }
}
