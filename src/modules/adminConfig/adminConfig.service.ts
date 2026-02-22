import { BaseService } from "src/base/BaseService";
import { AdminConfigRepository } from "./adminConfig.repository";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import { AdminConfig } from "src/generated/prisma";
import {
  CreateAdminConfigInput,
  createAdminConfigSchema,
  UpdateAdminConfigInput,
  updateAdminConfigSchema,
} from "./adminConfig.schema";

export class AdminConfigService extends BaseService<
  AdminConfig,
  CreateAdminConfigInput,
  UpdateAdminConfigInput
> {
  protected repository: AdminConfigRepository;
  protected tableName = "admin_config";
  protected createSchema = createAdminConfigSchema;
  protected updateSchema = updateAdminConfigSchema;

  constructor() {
    super();
    this.repository = new AdminConfigRepository();
  }

  protected async beforeCreate(
    data: CreateAdminConfigInput,
    ctx: ServiceContext
  ): Promise<CreateAdminConfigInput> {
    return data;
  }

  protected async beforeUpdate(
    id: string,
    data: UpdateAdminConfigInput,
    ctx: ServiceContext
  ): Promise<UpdateAdminConfigInput> {
    return data;
  }

  async findByCode(code: string): Promise<AdminConfig | null> {
    return this.repository.findByCode(code);
  }

  async findWildCardAdminConfigs(ctx: ServiceContext): Promise<AdminConfig[]> {
    return this.repository.findWildCardAdminConfigs();
  }

  async delete(
    id: string,
    ctx: ServiceContext,
    soft: boolean = true
  ): Promise<AdminConfig> {
    if (soft) {
      return this.repository.softDelete(id, ["name"]);
    }
    return this.repository.delete(id);
  }
}
