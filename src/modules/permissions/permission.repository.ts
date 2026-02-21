import prisma from "@models/index.model";
import { BaseRepository } from "src/base/BaseRepository";
import { Permission } from "src/generated/prisma";

export class PermissionRepository extends BaseRepository<Permission> {
  protected modelName = "Permission";
  protected hasSystemField = true;

  async findByCode(code: string): Promise<Permission | null> {
    return this.model.findFirst({
      where: { code, deletedAt: null },
    });
  }

  async findWildCardPermissions(): Promise<Permission[]> {
    return this.model.findMany({
      where: { isWildcard: true, deletedAt: null },
    });
  }
}
