import { BaseService } from "src/base/BaseService";
import { AccessoryItemRepository } from "./accessoryItem.repository";
import {
  createAccessoryItemSchema,
  updateAccessoryItemSchema,
  CreateAccessoryItemInput,
  UpdateAccessoryItemInput,
} from "./accessoryItem.schema";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import { AccessoryItem } from "src/generated/prisma";

export class AccessoryItemService extends BaseService<
  AccessoryItem,
  CreateAccessoryItemInput,
  UpdateAccessoryItemInput
> {
  protected repository: AccessoryItemRepository;
  protected tableName = "accessory_items";
  protected createSchema = createAccessoryItemSchema;
  protected updateSchema = updateAccessoryItemSchema;

  constructor() {
    super();
    this.repository = new AccessoryItemRepository();
  }

  protected async beforeCreate(
    data: CreateAccessoryItemInput,
    ctx: ServiceContext
  ): Promise<CreateAccessoryItemInput> {
    const existingSku = await this.repository.findBySku(data.sku);
    if (existingSku) {
      throw new AppError(
        "error.accessory_item.sku_already_exists",
        StatusCodes.CONFLICT
      );
    }

    return data;
  }

  protected async beforeUpdate(
    id: string,
    data: UpdateAccessoryItemInput,
    ctx: ServiceContext
  ): Promise<UpdateAccessoryItemInput> {
    if (data.sku) {
      const existing = await this.repository.findBySku(data.sku);
      if (existing && existing.id !== id) {
        throw new AppError(
          "error.accessory_item.sku_already_exists",
          StatusCodes.CONFLICT
        );
      }
    }

    return data;
  }

  protected async beforeDelete(
    id: string,
    ctx: ServiceContext
  ): Promise<void> {
    const hasOrders = await this.repository.hasActiveOrders(id);
    if (hasOrders) {
      throw new AppError(
        "error.accessory_item.has_active_orders",
        StatusCodes.BAD_REQUEST
      );
    }
  }

  async delete(
    id: string,
    ctx: ServiceContext,
    soft: boolean = true
  ): Promise<AccessoryItem> {
    if (soft) {
      return this.repository.softDelete(id, ["sku"]);
    }
    return this.repository.delete(id);
  }
}
