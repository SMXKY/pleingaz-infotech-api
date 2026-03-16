import { BaseRepository } from "src/base/BaseRepository";
import { AccessoryItem } from "src/generated/prisma";

export class AccessoryItemRepository extends BaseRepository<AccessoryItem> {
  protected modelName = "accessoryItem";
  protected hasSystemField = false;

  async findBySku(sku: string): Promise<AccessoryItem | null> {
    return this.model.findFirst({
      where: { sku, deletedAt: null },
    });
  }

  async hasActiveOrders(id: string): Promise<boolean> {
    const item = await this.model.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            accessoryPurchaseOrderItems: true,
          },
        },
      },
    });

    if (!item) return false;
    return item._count.accessoryPurchaseOrderItems > 0;
  }
}
