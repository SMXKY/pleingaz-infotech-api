import { BaseService } from "src/base/BaseService";
import { RolePermissionRepository } from "./rolePermission.repository";
import {
  createRolePermissionSchema,
  CreateRolePermissionInput,
  updateRolePermissionSchema,
  UpdateRolePermissionInput,
} from "./rolePermission.schema";
import { ServiceContext } from "@appTypes/base.types";
import { RolePermission } from "src/generated/prisma";
export class RolePermissionService extends BaseService<
  RolePermission,
  CreateRolePermissionInput,
  UpdateRolePermissionInput
> {
  protected repository: RolePermissionRepository;
  protected tableName = "role_permissions";
  protected createSchema = createRolePermissionSchema;
  protected updateSchema = updateRolePermissionSchema;

  constructor() {
    super();
    this.repository = new RolePermissionRepository();
  }

  protected async beforeCreate(
    data: CreateRolePermissionInput,
    ctx: ServiceContext
  ): Promise<CreateRolePermissionInput> {
    return data;
  }

  protected async beforeUpdate(
    id: string,
    data: UpdateRolePermissionInput,
    ctx: ServiceContext
  ): Promise<UpdateRolePermissionInput> {
    return data;
  }

  async delete(
    id: string,
    ctx: ServiceContext,
    soft: boolean = true
  ): Promise<RolePermission> {
    if (soft) {
      return this.repository.softDelete(id, ["name"]);
    }
    return this.repository.delete(id);
  }
}
