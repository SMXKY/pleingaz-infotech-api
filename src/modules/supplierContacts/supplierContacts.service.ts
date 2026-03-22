import { BaseService } from "src/base/BaseService";
import { SupplierContactRepository } from "./supplierContacts.repository";
import {
  addSupplierContactSchema,
  updateSupplierContactSchema,
  AddSupplierContactInput,
  UpdateSupplierContactInput,
} from "./supplierContacts.schema";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import { SupplierContact } from "src/generated/prisma";
import prisma from "@models/index.model";
import { LogCategory, LogOperation } from "@appTypes/log.type";

export class SupplierContactService extends BaseService<
  SupplierContact,
  AddSupplierContactInput,
  UpdateSupplierContactInput
> {
  protected repository: SupplierContactRepository;
  protected tableName = "supplier_contacts";
  protected createSchema = addSupplierContactSchema;
  protected updateSchema = updateSupplierContactSchema;

  constructor() {
    super();
    this.repository = new SupplierContactRepository();
  }

  private async ensureSupplierExists(supplierId: string): Promise<void> {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, deletedAt: null },
    });
    if (!supplier) {
      throw new AppError(
        "error.supplier_contact.supplier_not_found",
        StatusCodes.NOT_FOUND
      );
    }
  }

  private async ensureContactBelongsToSupplier(
    contactId: string,
    supplierId: string
  ): Promise<SupplierContact> {
    const contact = await this.repository.findByIdAndSupplier(
      contactId,
      supplierId
    );
    if (!contact) {
      throw new AppError(
        "error.supplier_contact.not_found",
        StatusCodes.NOT_FOUND
      );
    }
    return contact;
  }

  protected async beforeCreate(
    data: AddSupplierContactInput,
    ctx: ServiceContext
  ): Promise<AddSupplierContactInput> {
    return data;
  }

  protected async beforeUpdate(
    id: string,
    data: UpdateSupplierContactInput,
    ctx: ServiceContext
  ): Promise<UpdateSupplierContactInput> {
    return data;
  }

  protected async beforeDelete(
    id: string,
    ctx: ServiceContext
  ): Promise<void> {}

  async listContacts(
    supplierId: string,
    ctx: ServiceContext
  ): Promise<SupplierContact[]> {
    await this.ensureSupplierExists(supplierId);
    return this.repository.findAllBySupplier(supplierId);
  }

  async addContact(
    supplierId: string,
    data: AddSupplierContactInput,
    ctx: ServiceContext
  ): Promise<SupplierContact> {
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
      if (data.isPrimary) {
        await this.repository.unsetPrimary(supplierId);
      }

      const count = await this.repository.countActive(supplierId);
      const isPrimary = data.isPrimary || count === 0;

      const contact = await this.repository.create({
        ...data,
        isPrimary,
        supplierId,
        isActive: true,
      } as any);

      if (ctx.req) {
        this.log(ctx.req, {
          operation: LogOperation.CREATE,
          category: LogCategory.WRITE,
          recordId: (contact as any).id,
          newState: contact as Record<string, any>,
          userId: ctx.userId,
          userEmail: ctx.userEmail || "system",
          requestId: ctx.requestId,
        });
      }

      return contact;
    });

    await this.afterCreate(record, ctx);

    return record;
  }

  async updateContact(
    supplierId: string,
    contactId: string,
    data: UpdateSupplierContactInput,
    ctx: ServiceContext
  ): Promise<SupplierContact> {
    await this.ensureSupplierExists(supplierId);
    const existing = await this.ensureContactBelongsToSupplier(
      contactId,
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

    data = await this.beforeUpdate(contactId, data, ctx);

    const record = await this.repository.transaction(async (tx) => {
      if (data.isPrimary) {
        await this.repository.unsetPrimary(supplierId);
      }

      const updated = await this.repository.update(contactId, data as any);

      const changedFields = this.getChangedFields(
        existing as Record<string, any>,
        updated as Record<string, any>
      );

      if (ctx.req) {
        this.log(ctx.req, {
          operation: LogOperation.UPDATE,
          category: LogCategory.WRITE,
          recordId: contactId,
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

  async setPrimary(
    supplierId: string,
    contactId: string,
    ctx: ServiceContext
  ): Promise<SupplierContact> {
    await this.ensureSupplierExists(supplierId);
    const existing = await this.ensureContactBelongsToSupplier(
      contactId,
      supplierId
    );

    const record = await this.repository.transaction(async (tx) => {
      await this.repository.unsetPrimary(supplierId);

      const updated = await this.repository.update(contactId, {
        isPrimary: true,
      } as any);

      if (ctx.req) {
        this.log(ctx.req, {
          operation: LogOperation.UPDATE,
          category: LogCategory.WRITE,
          recordId: contactId,
          previousState: existing as Record<string, any>,
          newState: updated as Record<string, any>,
          changedFields: ["isPrimary"],
          userId: ctx.userId,
          userEmail: ctx.userEmail || "system",
          requestId: ctx.requestId,
        });
      }

      return updated;
    });

    return record;
  }

  async deleteContact(
    supplierId: string,
    contactId: string,
    ctx: ServiceContext
  ): Promise<SupplierContact> {
    await this.ensureSupplierExists(supplierId);
    const existing = await this.ensureContactBelongsToSupplier(
      contactId,
      supplierId
    );

    const activeCount = await this.repository.countActive(supplierId);
    if (activeCount <= 1) {
      throw new AppError(
        "error.supplier_contact.cannot_delete_last_contact",
        StatusCodes.BAD_REQUEST
      );
    }

    await this.beforeDelete(contactId, ctx);

    const record = await this.repository.transaction(async (tx) => {
      const deleted = await this.repository.softDelete(contactId);

      if (existing.isPrimary) {
        await this.repository.promoteNextPrimary(supplierId, contactId, tx);
      }

      if (ctx.req) {
        this.log(ctx.req, {
          operation: LogOperation.DELETE,
          category: LogCategory.WRITE,
          recordId: contactId,
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
