import { BaseService } from "src/base/BaseService";
import { SupplierCommercialTermsRepository } from "./supplierCormercialTerms.repository";
import {
  updateSupplierCommercialTermsSchema,
  UpdateSupplierCommercialTermsInput,
} from "./supplierCormercialTerms.schema";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import { SupplierCommercialTerms } from "src/generated/prisma";
import prisma from "@models/index.model";
import { LogCategory, LogOperation } from "@appTypes/log.type";

export class SupplierCommercialTermsService extends BaseService<
  SupplierCommercialTerms,
  any,
  UpdateSupplierCommercialTermsInput
> {
  protected repository: SupplierCommercialTermsRepository;
  protected tableName = "supplier_commercial_terms";
  protected updateSchema = updateSupplierCommercialTermsSchema;

  constructor() {
    super();
    this.repository = new SupplierCommercialTermsRepository();
  }

  private async ensureSupplierExists(supplierId: string): Promise<void> {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, deletedAt: null },
    });
    if (!supplier) {
      throw new AppError(
        "error.supplier_commercial_terms.supplier_not_found",
        StatusCodes.NOT_FOUND
      );
    }
  }

  private async getTermsOrThrow(
    supplierId: string
  ): Promise<SupplierCommercialTerms> {
    const terms = await this.repository.findBySupplier(supplierId);
    if (!terms) {
      throw new AppError(
        "error.supplier_commercial_terms.not_found",
        StatusCodes.NOT_FOUND
      );
    }
    return terms;
  }

  protected async beforeUpdate(
    id: string,
    data: UpdateSupplierCommercialTermsInput,
    ctx: ServiceContext
  ): Promise<UpdateSupplierCommercialTermsInput> {
    return data;
  }

  async getCommercialTerms(
    supplierId: string,
    ctx: ServiceContext
  ): Promise<SupplierCommercialTerms> {
    await this.ensureSupplierExists(supplierId);
    return this.getTermsOrThrow(supplierId);
  }

  async updateCommercialTerms(
    supplierId: string,
    data: UpdateSupplierCommercialTermsInput,
    ctx: ServiceContext
  ): Promise<SupplierCommercialTerms> {
    await this.ensureSupplierExists(supplierId);
    const existing = await this.getTermsOrThrow(supplierId);

    if (this.updateSchema) {
      const result = this.updateSchema.safeParse(data);
      if (!result.success) {
        const message = result.error.issues[0].message;
        throw new AppError(message, StatusCodes.BAD_REQUEST);
      }
      data = result.data;
    }

    data = await this.beforeUpdate(existing.id, data, ctx);

    const record = await this.repository.transaction(async (tx) => {
      const updated = await this.repository.updateBySupplier(
        supplierId,
        data as any
      );

      const changedFields = this.getChangedFields(
        existing as Record<string, any>,
        updated as Record<string, any>
      );

      if (ctx.req) {
        this.log(ctx.req, {
          operation: LogOperation.UPDATE,
          category: LogCategory.WRITE,
          recordId: existing.id,
          previousState: existing as Record<string, any>,
          newState: updated as Record<string, any>,
          changedFields,
          userId: ctx.userId,
          userEmail: ctx.userEmail || "system",
          requestId: ctx.requestId,
        });
      }

      return updated;
    });

    await this.afterUpdate(record, ctx);

    return record;
  }
}
