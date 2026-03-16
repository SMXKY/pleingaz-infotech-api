import { BaseService } from "src/base/BaseService";
import { SupplierPaymentMethodRepository } from "./supplierPaymentMethods.repository";
import {
  addSupplierPaymentMethodSchema,
  updateSupplierPaymentMethodSchema,
  AddSupplierPaymentMethodInput,
  UpdateSupplierPaymentMethodInput,
} from "./supplierPaymentMethods.schema";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import { SupplierPaymentMethod } from "src/generated/prisma";
import { prisma } from "src";
import { LogCategory, LogOperation } from "@appTypes/log.type";

export class SupplierPaymentMethodService extends BaseService<
  SupplierPaymentMethod,
  AddSupplierPaymentMethodInput,
  UpdateSupplierPaymentMethodInput
> {
  protected repository: SupplierPaymentMethodRepository;
  protected tableName = "supplier_payment_methods";
  protected createSchema = addSupplierPaymentMethodSchema;
  protected updateSchema = updateSupplierPaymentMethodSchema;

  constructor() {
    super();
    this.repository = new SupplierPaymentMethodRepository();
  }

  private async ensureSupplierExists(supplierId: string): Promise<void> {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, deletedAt: null },
    });
    if (!supplier) {
      throw new AppError(
        "error.supplier_payment_method.supplier_not_found",
        StatusCodes.NOT_FOUND
      );
    }
  }

  private async ensureMethodBelongsToSupplier(
    methodId: string,
    supplierId: string
  ): Promise<SupplierPaymentMethod> {
    const method = await this.repository.findByIdAndSupplier(
      methodId,
      supplierId
    );
    if (!method) {
      throw new AppError(
        "error.supplier_payment_method.not_found",
        StatusCodes.NOT_FOUND
      );
    }
    return method;
  }

  protected async beforeCreate(
    data: AddSupplierPaymentMethodInput,
    ctx: ServiceContext
  ): Promise<AddSupplierPaymentMethodInput> {
    return data;
  }

  protected async beforeUpdate(
    id: string,
    data: UpdateSupplierPaymentMethodInput,
    ctx: ServiceContext
  ): Promise<UpdateSupplierPaymentMethodInput> {
    return data;
  }

  protected async beforeDelete(
    id: string,
    ctx: ServiceContext
  ): Promise<void> {}

  async listPaymentMethods(
    supplierId: string,
    ctx: ServiceContext
  ): Promise<SupplierPaymentMethod[]> {
    await this.ensureSupplierExists(supplierId);
    return this.repository.findAllBySupplier(supplierId);
  }

  async addPaymentMethod(
    supplierId: string,
    data: AddSupplierPaymentMethodInput,
    ctx: ServiceContext
  ): Promise<SupplierPaymentMethod> {
    await this.ensureSupplierExists(supplierId);

    if (this.createSchema) {
      const result = this.createSchema.safeParse(data);
      if (!result.success) {
        const message = result.error.issues[0].message;
        throw new AppError(message, StatusCodes.BAD_REQUEST);
      }
      data = result.data;
    }

    data = await this.beforeCreate(data, ctx);

    const record = await this.repository.transaction(async (tx) => {
      if (data.isDefault) {
        await this.repository.unsetDefault(supplierId);
      }

      const count = await this.repository.countActive(supplierId);
      const isDefault = data.isDefault || count === 0;

      const method = await this.repository.create({
        ...data,
        isDefault,
        supplierId,
        isActive: true,
      } as any);

      if (ctx.req) {
        this.log(ctx.req, {
          operation: LogOperation.CREATE,
          category: LogCategory.WRITE,
          recordId: (method as any).id,
          newState: method as Record<string, any>,
          userId: ctx.userId,
          userEmail: ctx.userEmail || "system",
          requestId: ctx.requestId,
        });
      }

      return method;
    });

    await this.afterCreate(record, ctx);

    return record;
  }

  async updatePaymentMethod(
    supplierId: string,
    methodId: string,
    data: UpdateSupplierPaymentMethodInput,
    ctx: ServiceContext
  ): Promise<SupplierPaymentMethod> {
    await this.ensureSupplierExists(supplierId);
    const existing = await this.ensureMethodBelongsToSupplier(
      methodId,
      supplierId
    );

    if (this.updateSchema) {
      const result = this.updateSchema.safeParse(data);
      if (!result.success) {
        const message = result.error.issues[0].message;
        throw new AppError(message, StatusCodes.BAD_REQUEST);
      }
      data = result.data;
    }

    data = await this.beforeUpdate(methodId, data, ctx);

    const record = await this.repository.transaction(async (tx) => {
      if (data.isDefault) {
        await this.repository.unsetDefault(supplierId);
      }

      const updated = await this.repository.update(methodId, data as any);

      const changedFields = this.getChangedFields(
        existing as Record<string, any>,
        updated as Record<string, any>
      );

      if (ctx.req) {
        this.log(ctx.req, {
          operation: LogOperation.UPDATE,
          category: LogCategory.WRITE,
          recordId: methodId,
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

  async setDefault(
    supplierId: string,
    methodId: string,
    ctx: ServiceContext
  ): Promise<SupplierPaymentMethod> {
    await this.ensureSupplierExists(supplierId);
    const existing = await this.ensureMethodBelongsToSupplier(
      methodId,
      supplierId
    );

    const record = await this.repository.transaction(async (tx) => {
      await this.repository.unsetDefault(supplierId);

      const updated = await this.repository.update(methodId, {
        isDefault: true,
      } as any);

      if (ctx.req) {
        this.log(ctx.req, {
          operation: LogOperation.UPDATE,
          category: LogCategory.WRITE,
          recordId: methodId,
          previousState: existing as Record<string, any>,
          newState: updated as Record<string, any>,
          changedFields: ["isDefault"],
          userId: ctx.userId,
          userEmail: ctx.userEmail || "system",
          requestId: ctx.requestId,
        });
      }

      return updated;
    });

    return record;
  }

  async deletePaymentMethod(
    supplierId: string,
    methodId: string,
    ctx: ServiceContext
  ): Promise<SupplierPaymentMethod> {
    await this.ensureSupplierExists(supplierId);
    const existing = await this.ensureMethodBelongsToSupplier(
      methodId,
      supplierId
    );

    const activeCount = await this.repository.countActive(supplierId);
    if (activeCount <= 1) {
      throw new AppError(
        "error.supplier_payment_method.cannot_delete_last_method",
        StatusCodes.BAD_REQUEST
      );
    }

    await this.beforeDelete(methodId, ctx);

    const record = await this.repository.transaction(async (tx) => {
      const deleted = await this.repository.softDelete(methodId);

      if (existing.isDefault) {
        await this.repository.promoteNextDefault(supplierId, methodId);
      }

      if (ctx.req) {
        this.log(ctx.req, {
          operation: LogOperation.DELETE,
          category: LogCategory.WRITE,
          recordId: methodId,
          previousState: existing as Record<string, any>,
          userId: ctx.userId,
          userEmail: ctx.userEmail || "system",
          requestId: ctx.requestId,
        });
      }

      return deleted;
    });

    await this.afterDelete(record, ctx);

    return record;
  }
}
