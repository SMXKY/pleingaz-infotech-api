import { BaseService } from "src/base/BaseService";
import { AccessoryCategoryRepository } from "./accessoryCategory.repository";
import { AccessoryCategory } from "src/generated/prisma";

export class AccessoryCategoryService extends BaseService<
  AccessoryCategory,
  any,
  any
> {
  protected repository: AccessoryCategoryRepository;
  protected tableName = "accessory_categories";
  protected createSchema = null as any;
  protected updateSchema = null as any;

  constructor() {
    super();
    this.repository = new AccessoryCategoryRepository();
  }
}
