import { BaseRepository } from "src/base/BaseRepository";
import { SupplierCommercialTerms } from "src/generated/prisma";

export class SupplierCommercialTermsRepository extends BaseRepository<SupplierCommercialTerms> {
  protected modelName = "supplierCommercialTerms";

  async findBySupplier(
    supplierId: string
  ): Promise<SupplierCommercialTerms | null> {
    return this.model.findFirst({
      where: { supplierId, deletedAt: null },
    });
  }

  async updateBySupplier(
    supplierId: string,
    data: Partial<SupplierCommercialTerms>
  ): Promise<SupplierCommercialTerms> {
    return this.model.update({
      where: { supplierId },
      data,
    });
  }
}
