import { BaseService } from "src/base/BaseService";
import { SupplierRepository } from "./supplier.repository";
import {
  createSupplierSchema,
  updateSupplierSchema,
  CreateSupplierInput,
  UpdateSupplierInput,
} from "./supplier.schema";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import { Supplier, Status } from "src/generated/prisma";
import { prisma } from "src";
import { permissionCache } from "../users/utilites/getUserPermissions.util";
import { UserStatus } from "@appTypes/user.types";
import { Request, Response } from "express";
import { LogCategory, LogOperation } from "@appTypes/log.type";
import { recalculateSupplierMetrics } from "@utils/recalculateSupplierMetrics.util";

export class SupplierService extends BaseService<
  Supplier,
  CreateSupplierInput,
  UpdateSupplierInput
> {
  protected repository: SupplierRepository;
  protected tableName = "suppliers";
  protected createSchema = createSupplierSchema;
  protected updateSchema = updateSupplierSchema;

  constructor() {
    super();
    this.repository = new SupplierRepository();
  }

  protected async beforeCreate(
    data: CreateSupplierInput,
    ctx: ServiceContext
  ): Promise<CreateSupplierInput> {
    return data;
  }

  protected async beforeUpdate(
    id: string,
    data: UpdateSupplierInput,
    ctx: ServiceContext
  ): Promise<UpdateSupplierInput> {
    return data;
  }

  protected async beforeDelete(id: string, ctx: ServiceContext): Promise<void> {
    const order = await this.repository.findSupplierWithOrders(id);
    if (order) {
      throw new AppError(
        "error.supplier.has_active_orders",
        StatusCodes.BAD_REQUEST
      );
    }
  }

  async findByName(name: string): Promise<Supplier | null> {
    return this.repository.findByName(name);
  }

  async findActiveSuppliers(ctx: ServiceContext): Promise<Supplier[]> {
    return this.repository.findActiveSuppliers();
  }

  async delete(
    id: string,
    ctx: ServiceContext,
    soft: boolean = true
  ): Promise<Supplier> {
    if (soft) {
      return this.repository.softDelete(id, ["name", "code"]);
    }
    return this.repository.delete(id);
  }

  async createSupplier(
    data: CreateSupplierInput,
    ctx: ServiceContext
  ): Promise<any> {
    const {
      contacts,
      paymentMethods,
      commercialTerms,
      addresses,
      ...supplierData
    } = data;

    if (!ctx.userId) {
      throw new AppError(
        "error.auth.user_id_missing",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const userId = ctx.userId;

    const result = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.create({
        data: {
          ...supplierData,
          createdById: userId,
        },
      });
      // Ensure one primary contact
      if (!contacts.some((c) => c.isPrimary)) {
        contacts[0].isPrimary = true;
      }

      // Ensure one default payment method
      if (!paymentMethods.some((pm) => pm.isDefault)) {
        paymentMethods[0].isDefault = true;
      }

      await tx.supplierPaymentMethod.createMany({
        data: paymentMethods.map((pm) => ({
          ...pm,
          supplierId: supplier.id,
        })),
      });

      await tx.supplierCommercialTerms.create({
        data: {
          ...commercialTerms,
          supplierId: supplier.id,
        },
      });

      await tx.supplierContact.createMany({
        data: contacts.map((contact) => ({
          ...contact,
          supplierId: supplier.id,
        })),
      });

      await tx.supplierPerformanceMetrics.create({
        data: {
          supplierId: supplier.id,
          rating: 0,
        },
      });

      if (addresses && addresses.length > 0) {
        if (!addresses.some((a) => a.isDefault)) {
          addresses[0].isDefault = true;
        }

        await tx.supplierAddress.createMany({
          data: addresses.map((address) => ({
            ...address,
            supplierId: supplier.id,
          })),
        });
      }

      if (ctx.req) {
        await tx.activityLog.create({
          data: {
            userId: ctx.userId || null,
            userEmail: ctx.userEmail || "system",
            operation: "CREATE",
            category: "WRITE",
            tableName: "suppliers",
            recordId: supplier.id,
            newState: supplier,
            changedFields: [],
            status: "SUCCESS",
          },
        });
      }

      return tx.supplier.findUniqueOrThrow({
        where: { id: supplier.id },
        include: {
          contacts: true,
          paymentMethods: true,
          commercialTerms: true,
          addresses: true,
          performanceMetrics: true,
        },
      });
    });

    return result;
  }

  async getSupplierWithOrders(id: string): Promise<any> {
    const supplier = await this.repository.findSupplierWithOrders(id);

    if (!supplier) {
      throw new AppError("error.supplier.not_found", StatusCodes.NOT_FOUND);
    }

    return supplier;
  }

  async getSupplierPerformance(id: string): Promise<any> {
    const supplier = await prisma.supplier.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true, code: true },
    });

    if (!supplier) {
      throw new AppError("error.supplier.not_found", StatusCodes.NOT_FOUND);
    }

    // Recalculate on fetch so data is always fresh
    await recalculateSupplierMetrics(id);

    const metrics = await prisma.supplierPerformanceMetrics.findUnique({
      where: { supplierId: id },
    });

    return {
      supplier,
      metrics: metrics
        ? {
            ...metrics,
            rating: metrics.rating?.toString() ?? null,
            onTimeDeliveryPct: metrics.onTimeDeliveryPct.toString(),
            avgLeadTimeDays: metrics.avgLeadTimeDays?.toString() ?? null,
            totalSpendCfa: metrics.totalSpendCfa.toString(),
          }
        : null,
    };
  }

  async getAllSuppliersPerformance(): Promise<any[]> {
    const suppliers = await prisma.supplier.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        tier: true,
        isPreferred: true,
        performanceMetrics: true,
      },
      orderBy: { name: "asc" },
    });

    return suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      type: s.type,
      tier: s.tier,
      isPreferred: s.isPreferred,
      metrics: s.performanceMetrics
        ? {
            totalOrders: s.performanceMetrics.totalOrders,
            completedOrders: s.performanceMetrics.completedOrders,
            onTimeDeliveries: s.performanceMetrics.onTimeDeliveries,
            onTimeDeliveryPct:
              s.performanceMetrics.onTimeDeliveryPct.toString(),
            avgLeadTimeDays:
              s.performanceMetrics.avgLeadTimeDays?.toString() ?? null,
            totalSpendCfa: s.performanceMetrics.totalSpendCfa.toString(),
            rating: s.performanceMetrics.rating?.toString() ?? null,
            lastOrderDate: s.performanceMetrics.lastOrderDate,
            lastCalculatedAt: s.performanceMetrics.lastCalculatedAt,
          }
        : null,
    }));
  }
}
