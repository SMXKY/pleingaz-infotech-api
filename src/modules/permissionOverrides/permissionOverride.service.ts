import { BaseService } from "src/base/BaseService";
import { PermissionOverrideRepository } from "./permissionOverride.repository";
import {
  createPermissionOverrideSchema,
  CreatePermissionOverrideInput,
  updatePermissionOverrideSchema,
  UpdatePermissionOverrideInput,
} from "./permissionOverride.schema";
import { ServiceContext } from "@appTypes/base.types";
import { PermissionOverride } from "src/generated/prisma";
export class PermissionOverrideService extends BaseService<
  PermissionOverride,
  CreatePermissionOverrideInput,
  UpdatePermissionOverrideInput
> {
  protected repository: PermissionOverrideRepository;
  protected tableName = "permission_overrides";
  protected createSchema = createPermissionOverrideSchema;
  protected updateSchema = updatePermissionOverrideSchema;

  constructor() {
    super();
    this.repository = new PermissionOverrideRepository();
  }

  protected async beforeCreate(
    data: CreatePermissionOverrideInput,
    ctx: ServiceContext
  ): Promise<CreatePermissionOverrideInput> {
    return data;
  }

  protected async beforeUpdate(
    id: string,
    data: UpdatePermissionOverrideInput,
    ctx: ServiceContext
  ): Promise<UpdatePermissionOverrideInput> {
    return data;
  }

  async delete(
    id: string,
    ctx: ServiceContext,
    soft: boolean = true
  ): Promise<PermissionOverride> {
    if (soft) {
      return this.repository.softDelete(id, ["name"]);
    }
    return this.repository.delete(id);
  }
}
