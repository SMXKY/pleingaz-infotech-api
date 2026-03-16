import { BaseRepository } from "src/base/BaseRepository";
import { GasBottleType } from "src/generated/prisma";

export class GasBottleTypeRepository extends BaseRepository<GasBottleType> {
  protected modelName = "gasBottleType";
  protected hasSystemField = false;

  async findByCode(code: string): Promise<GasBottleType | null> {
    return this.model.findFirst({
      where: { code, deletedAt: null },
    });
  }
}
