import { BaseService } from "src/base/BaseService";
import { PermissionRepository } from "./permission.repository";
import {
  createPermissionSchema,
  updatePermissionSchema,
  CreatePermissionInput,
  UpdatePermissionInput,
} from "./permission.schema";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import { Permission } from "src/generated/prisma";

export class PermissionService extends BaseService<
  Permission,
  CreatePermissionInput,
  UpdatePermissionInput
> {
  protected repository: PermissionRepository;
  protected tableName = "Permissions";
  protected createSchema = createPermissionSchema;
  protected updateSchema = updatePermissionSchema;

  constructor() {
    super();
    this.repository = new PermissionRepository();
  }

  protected async beforeCreate(
    data: CreatePermissionInput,
    ctx: ServiceContext
  ): Promise<CreatePermissionInput> {
    return data;
  }

  protected async beforeUpdate(
    id: string,
    data: UpdatePermissionInput,
    ctx: ServiceContext
  ): Promise<UpdatePermissionInput> {
    return data;
  }

  async findByCode(code: string): Promise<Permission | null> {
    return this.repository.findByCode(code);
  }

  async findWildCardPermissions(ctx: ServiceContext): Promise<Permission[]> {
    return this.repository.findWildCardPermissions();
  }

  async delete(
    id: string,
    ctx: ServiceContext,
    soft: boolean = true
  ): Promise<Permission> {
    if (soft) {
      return this.repository.softDelete(id, ["name"]);
    }
    return this.repository.delete(id);
  }
}
