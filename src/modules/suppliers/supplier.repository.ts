import prisma from "@models/index.model";
import { BaseRepository } from "src/base/BaseRepository";
import { Supplier } from "src/generated/prisma";

export class SupplierRepository extends BaseRepository<Supplier> {
  protected modelName = "Supplier";
  protected hasSystemField = true;

  async findByName(name: string): Promise<Supplier | null> {
    return this.model.findFirst({
      where: { name, deletedAt: null },
    });
  }

  async findActiveSuppliers(): Promise<Supplier[]> {
    return this.model.findMany({
      where: { isActive: true, deletedAt: null },
    });
  }

  async findSupplierWithOrders(id: string): Promise<Supplier | null> {
    return this.model.findUnique({
      where: { id },
      include: {
        gasPurchaseOrders: true,
        gasBottlePurchaseOrders: true,
        accessoryPurchaseOrders: true,
      },
    });
  }
}
