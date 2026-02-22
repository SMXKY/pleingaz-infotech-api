import prisma from "@models/index.model";
import { BaseRepository } from "src/base/BaseRepository";
import { PermissionOverride } from "src/generated/prisma";

export class PermissionOverrideRepository extends BaseRepository<PermissionOverride> {
  protected modelName = "PermissionOverride";
  protected hasSystemField = true;

  async findByCode(code: string): Promise<PermissionOverride | null> {
    return this.model.findFirst({
      where: { code, deletedAt: null },
    });
  }

  async findWildCardPermissionOverrides(): Promise<PermissionOverride[]> {
    return this.model.findMany({
      where: { isWildcard: true, deletedAt: null },
    });
  }
}
