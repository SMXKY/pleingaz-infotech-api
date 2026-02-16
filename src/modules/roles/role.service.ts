import { BaseService } from "src/base/BaseService";
import { RoleRepository } from "./role.repository";
import {
  createRoleSchema,
  updateRoleSchema,
  CreateRoleInput,
  UpdateRoleInput,
} from "./role.schema";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import { Role } from "src/generated/prisma";

export class RoleService extends BaseService<
  Role,
  CreateRoleInput,
  UpdateRoleInput
> {
  protected repository: RoleRepository;
  protected tableName = "roles";
  protected createSchema = createRoleSchema;
  protected updateSchema = updateRoleSchema;

  constructor() {
    super();
    this.repository = new RoleRepository();
  }

  protected async beforeCreate(
    data: CreateRoleInput,
    ctx: ServiceContext
  ): Promise<CreateRoleInput> {
    return data;
  }

  protected async beforeUpdate(
    id: string,
    data: UpdateRoleInput,
    ctx: ServiceContext
  ): Promise<UpdateRoleInput> {
    return data;
  }

  protected async beforeDelete(id: string, ctx: ServiceContext): Promise<void> {
    const numberOfUsers = await this.repository.findUsersWithRole(id);
    if (numberOfUsers && numberOfUsers > 0) {
      throw new AppError("error.role.has_users", StatusCodes.BAD_REQUEST);
    }
  }

  async findByName(name: string): Promise<Role | null> {
    return this.repository.findByName(name);
  }

  async findActiveRoles(ctx: ServiceContext): Promise<Role[]> {
    return this.repository.findActiveRoles();
  }

  async findWithPermissions(
    id: string,
    ctx: ServiceContext
  ): Promise<Role | null> {
    return this.repository.findWithPermissions(id);
  }

  async delete(
    id: string,
    ctx: ServiceContext,
    soft: boolean = true
  ): Promise<Role> {
    if (soft) {
      return this.repository.softDelete(id, ["name"]);
    }
    return this.repository.delete(id);
  }
}
