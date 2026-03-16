import { BaseRepository } from "src/base/BaseRepository";
import { AccessoryCategory } from "src/generated/prisma";

export class AccessoryCategoryRepository extends BaseRepository<AccessoryCategory> {
  protected modelName = "accessoryCategory";
  protected hasSystemField = false;

  async findByCode(code: string): Promise<AccessoryCategory | null> {
    return this.model.findFirst({
      where: { code, deletedAt: null },
    });
  }
}
