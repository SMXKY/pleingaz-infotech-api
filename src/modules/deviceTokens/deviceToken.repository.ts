import { BaseRepository } from "src/base/BaseRepository";
import { DeviceToken } from "src/generated/prisma";

export class DeviceTokenRepository extends BaseRepository<DeviceToken> {
  protected modelName = "DeviceToken";
  protected hasSystemField = true;

  async findActiveDeviceTokens(): Promise<DeviceToken[]> {
    return this.model.findMany({
      where: { isActive: true, deletedAt: null },
    });
  }
}
