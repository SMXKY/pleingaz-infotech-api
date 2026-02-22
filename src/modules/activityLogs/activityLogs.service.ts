import { BaseService } from "src/base/BaseService";
import { ActivityLogRepository } from "./activityLogs.repository";
import {
  createActivityLogSchema,
  CreateActivityLogInput,
} from "./activityLogs.schema";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import { ActivityLog } from "src/generated/prisma";

export class ActivityLogService extends BaseService<
  ActivityLog,
  CreateActivityLogInput
> {
  protected repository: ActivityLogRepository;
  protected tableName = "ActivityLogs";
  protected createSchema = createActivityLogSchema;
  protected updateSchema = createActivityLogSchema;

  constructor() {
    super();
    this.repository = new ActivityLogRepository();
  }

  protected async beforeCreate(
    data: CreateActivityLogInput,
    ctx: ServiceContext
  ): Promise<CreateActivityLogInput> {
    return data;
  }

  protected async beforeUpdate(
    id: string,
    data: CreateActivityLogInput,
    ctx: ServiceContext
  ): Promise<CreateActivityLogInput> {
    return data;
  }

  async findByCode(code: string): Promise<ActivityLog | null> {
    return this.repository.findByCode(code);
  }

  async findWildCardActivityLogs(ctx: ServiceContext): Promise<ActivityLog[]> {
    return this.repository.findWildCardActivityLogs();
  }

  async delete(
    id: string,
    ctx: ServiceContext,
    soft: boolean = true
  ): Promise<ActivityLog> {
    if (soft) {
      return this.repository.softDelete(id, []);
    }
    return this.repository.delete(id);
  }
}
