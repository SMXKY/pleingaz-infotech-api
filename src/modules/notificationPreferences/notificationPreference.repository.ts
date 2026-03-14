import { BaseRepository } from "src/base/BaseRepository";
import { NotificationPreference } from "src/generated/prisma";

export class NotificationPreferenceRepository extends BaseRepository<NotificationPreference> {
  protected modelName = "NotificationPreference";
  protected hasSystemField = false;

  async findActiveNotificationPreferences(): Promise<NotificationPreference[]> {
    return this.model.findMany({
      where: { isActive: true, deletedAt: null },
    });
  }
}
