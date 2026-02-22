import prisma from "@models/index.model";
import { BaseRepository } from "src/base/BaseRepository";
import { RolePermission } from "src/generated/prisma";

export class RolePermissionRepository extends BaseRepository<RolePermission> {
  protected modelName = "RolePermission";
  protected hasSystemField = true;

  async findByCode(code: string): Promise<RolePermission | null> {
    return this.model.findFirst({
      where: { code, deletedAt: null },
    });
  }

  async findWildCardRolePermissions(): Promise<RolePermission[]> {
    return this.model.findMany({
      where: { isWildcard: true, deletedAt: null },
    });
  }
}
