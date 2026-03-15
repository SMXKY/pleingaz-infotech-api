import { BaseService } from "src/base/BaseService";
import { FinanceSettingsRepository } from "./financeSettings.repository";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import { FinanceSettings } from "src/generated/prisma";
import {
  CreateFinanceSettingsInput,
  createFinanceSettingsSchema,
  UpdateFinanceSettingsInput,
  updateFinanceSettingsSchema,
} from "./financeSettings.schema";

export class FinanceSettingsService extends BaseService<
  FinanceSettings,
  CreateFinanceSettingsInput,
  UpdateFinanceSettingsInput
> {
  protected repository: FinanceSettingsRepository;
  protected tableName = "finance_settings";
  protected createSchema = createFinanceSettingsSchema;
  protected updateSchema = updateFinanceSettingsSchema;

  constructor() {
    super();
    this.repository = new FinanceSettingsRepository();
  }

  protected async beforeCreate(
    data: CreateFinanceSettingsInput,
    ctx: ServiceContext
  ): Promise<CreateFinanceSettingsInput> {
    return data;
  }

  protected async beforeUpdate(
    id: string,
    data: UpdateFinanceSettingsInput,
    ctx: ServiceContext
  ): Promise<UpdateFinanceSettingsInput> {
    return data;
  }

  async findByCode(code: string): Promise<FinanceSettings | null> {
    return this.repository.findByCode(code);
  }

  async findWildCardFinanceSettingss(
    ctx: ServiceContext
  ): Promise<FinanceSettings[]> {
    return this.repository.findWildCardFinanceSettingss();
  }

  async delete(
    id: string,
    ctx: ServiceContext,
    soft: boolean = true
  ): Promise<FinanceSettings> {
    if (soft) {
      return this.repository.softDelete(id, ["name"]);
    }
    return this.repository.delete(id);
  }
}
