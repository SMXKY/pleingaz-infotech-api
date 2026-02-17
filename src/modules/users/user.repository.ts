import prisma from "@models/index.model";
import { BaseRepository } from "src/base/BaseRepository";
import { User } from "src/generated/prisma";
import { UserStatus } from "@appTypes/user.types";

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
}
