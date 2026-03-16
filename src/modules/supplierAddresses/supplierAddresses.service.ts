import { BaseService } from "src/base/BaseService";
import { SupplierAddressRepository } from "./supplierAddresses.repository";
import {
  addSupplierAddressSchema,
  updateSupplierAddressSchema,
  AddSupplierAddressInput,
  UpdateSupplierAddressInput,
} from "./supplierAddresses.schema";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import { SupplierAddress, SupplierAddressType } from "src/generated/prisma";
import { prisma } from "src";
import { LogCategory, LogOperation } from "@appTypes/log.type";

export class SupplierAddressService extends BaseService<
  SupplierAddress,
  AddSupplierAddressInput,
  UpdateSupplierAddressInput
> {
  protected repository: SupplierAddressRepository;
  protected tableName = "supplier_addresses";
  protected createSchema = addSupplierAddressSchema;
  protected updateSchema = updateSupplierAddressSchema;

  constructor() {
    super();
    this.repository = new SupplierAddressRepository();
  }

  private async ensureSupplierExists(supplierId: string): Promise<void> {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, deletedAt: null },
    });
    if (!supplier) {
      throw new AppError(
        "error.supplier_address.supplier_not_found",
        StatusCodes.NOT_FOUND
      );
    }
  }

  private async ensureAddressBelongsToSupplier(
    addressId: string,
    supplierId: string
  ): Promise<SupplierAddress> {
    const address = await this.repository.findByIdAndSupplier(
      addressId,
      supplierId
    );
    if (!address) {
      throw new AppError(
        "error.supplier_address.not_found",
        StatusCodes.NOT_FOUND
      );
    }
    return address;
  }

  protected async beforeCreate(
    data: AddSupplierAddressInput,
    ctx: ServiceContext
  ): Promise<AddSupplierAddressInput> {
    return data;
  }

  protected async beforeUpdate(
    id: string,
    data: UpdateSupplierAddressInput,
    ctx: ServiceContext
  ): Promise<UpdateSupplierAddressInput> {
    return data;
  }

  protected async beforeDelete(
    id: string,
    ctx: ServiceContext
  ): Promise<void> {}

  async listAddresses(
    supplierId: string,
    ctx: ServiceContext
  ): Promise<SupplierAddress[]> {
    await this.ensureSupplierExists(supplierId);
    return this.repository.findAllBySupplier(supplierId);
  }

  async addAddress(
    supplierId: string,
    data: AddSupplierAddressInput,
    ctx: ServiceContext
  ): Promise<SupplierAddress> {
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

    const addressType = data.addressType || "PICKUP";

    const record = await this.repository.transaction(async (tx) => {
      if (data.isDefault) {
        await this.repository.unsetDefaultByType(
          supplierId,
          addressType as SupplierAddressType
        );
      }

      const count = await this.repository.countActive(supplierId);
      const isDefault = data.isDefault || count === 0;

      const address = await this.repository.create({
        ...data,
        addressType,
        isDefault,
        supplierId,
        isActive: true,
      } as any);

      if (ctx.req) {
        this.log(ctx.req, {
          operation: LogOperation.CREATE,
          category: LogCategory.WRITE,
          recordId: (address as any).id,
          newState: address as Record<string, any>,
          userId: ctx.userId,
          userEmail: ctx.userEmail || "system",
          requestId: ctx.requestId,
        });
      }

      return address;
    });

    await this.afterCreate(record, ctx);

    return record;
  }

  async updateAddress(
    supplierId: string,
    addressId: string,
    data: UpdateSupplierAddressInput,
    ctx: ServiceContext
  ): Promise<SupplierAddress> {
    await this.ensureSupplierExists(supplierId);
    const existing = await this.ensureAddressBelongsToSupplier(
      addressId,
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

    data = await this.beforeUpdate(addressId, data, ctx);

    const record = await this.repository.transaction(async (tx) => {
      const effectiveType = data.addressType || existing.addressType;

      if (data.isDefault) {
        await this.repository.unsetDefaultByType(
          supplierId,
          effectiveType as SupplierAddressType
        );
      }

      const updated = await this.repository.update(addressId, data as any);

      const changedFields = this.getChangedFields(
        existing as Record<string, any>,
        updated as Record<string, any>
      );

      if (ctx.req) {
        this.log(ctx.req, {
          operation: LogOperation.UPDATE,
          category: LogCategory.WRITE,
          recordId: addressId,
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
    addressId: string,
    ctx: ServiceContext
  ): Promise<SupplierAddress> {
    await this.ensureSupplierExists(supplierId);
    const existing = await this.ensureAddressBelongsToSupplier(
      addressId,
      supplierId
    );

    const record = await this.repository.transaction(async (tx) => {
      await this.repository.unsetDefaultByType(
        supplierId,
        existing.addressType as SupplierAddressType
      );

      const updated = await this.repository.update(addressId, {
        isDefault: true,
      } as any);

      if (ctx.req) {
        this.log(ctx.req, {
          operation: LogOperation.UPDATE,
          category: LogCategory.WRITE,
          recordId: addressId,
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

  async deleteAddress(
    supplierId: string,
    addressId: string,
    ctx: ServiceContext
  ): Promise<SupplierAddress> {
    await this.ensureSupplierExists(supplierId);
    const existing = await this.ensureAddressBelongsToSupplier(
      addressId,
      supplierId
    );

    const activeCount = await this.repository.countActive(supplierId);
    if (activeCount <= 1) {
      throw new AppError(
        "error.supplier_address.cannot_delete_last_address",
        StatusCodes.BAD_REQUEST
      );
    }

    await this.beforeDelete(addressId, ctx);

    const record = await this.repository.transaction(async (tx) => {
      const deleted = await this.repository.softDelete(addressId);

      if (existing.isDefault) {
        await this.repository.promoteNextDefault(
          supplierId,
          existing.addressType as SupplierAddressType,
          addressId
        );
      }

      if (ctx.req) {
        this.log(ctx.req, {
          operation: LogOperation.DELETE,
          category: LogCategory.WRITE,
          recordId: addressId,
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
