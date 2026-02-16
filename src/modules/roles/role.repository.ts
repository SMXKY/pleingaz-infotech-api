import prisma from "@models/index.model";
import { BaseRepository } from "src/base/BaseRepository";
import { Role } from "src/generated/prisma";
import { User } from "src/generated/prisma";

export class RoleRepository extends BaseRepository<Role> {
  protected modelName = "role";
  protected hasSystemField = true;

  async findByName(name: string): Promise<Role | null> {
    return this.model.findFirst({
      where: { name, deletedAt: null },
    });
  }

  async findActiveRoles(): Promise<Role[]> {
    return this.model.findMany({
      where: { isActive: true, deletedAt: null },
    });
  }

  async findWithPermissions(id: string): Promise<Role | null> {
    return this.model.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async findUsersWithRole(id: string): Promise<number> {
    const users = await prisma.user.findMany({
      where: {
        roleId: id,
      },
    });
    return users.length;
  }
}
