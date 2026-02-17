import prisma from "@models/index.model";
import { BaseRepository } from "src/base/BaseRepository";
import { Role, User } from "src/generated/prisma";
import { UserStatus } from "@appTypes/user.types";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";

export class UserRepository extends BaseRepository<User> {
  protected modelName = "user";
  protected hasSystemField = true;

  async findByUserName(username: string): Promise<User | null> {
    return this.model.findFirst({
      where: { username, deletedAt: null },
    });
  }

  async findActiveUsers(): Promise<User[]> {
    return this.model.findMany({
      where: { status: UserStatus.ACTIVE, deletedAt: null },
    });
  }

  async findTerminatedUsers(): Promise<User[]> {
    return this.model.findMany({
      where: { status: UserStatus.TERMINATED, deletedAt: null },
    });
  }

  static async getAllRoles(userId: string): Promise<string[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new AppError("error.user.not_found", StatusCodes.NOT_FOUND);
    }

    const roleOverrides = await prisma.roleOverride.findMany({
      where: {
        userId,
        isGranted: true,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { role: true },
    });

    const roleNames: string[] = [user.role.name];

    for (const override of roleOverrides) {
      if (override.role?.name && !roleNames.includes(override.role.name)) {
        roleNames.push(override.role.name);
      }
    }

    return roleNames;
  }
}
