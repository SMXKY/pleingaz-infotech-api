import { ZodSchema, ZodError } from "zod";
import { Request } from "express";
import { BaseRepository } from "./BaseRepository";
import { AppError } from "@utils/AppError.util";
import { logUserActivity } from "@utils/logUserActivity.util";
import { StatusCodes } from "http-status-codes";
import {
  ServiceContext,
  FindManyOptions,
  PaginatedResult,
} from "../appTypes/base.types";
import { LogCategory, LogOperation } from "@appTypes/log.type";
import { InputJsonValue } from "src/generated/prisma/runtime/client";

export abstract class BaseService<
  T,
  CreateDTO = Partial<T>,
  UpdateDTO = Partial<T>
> {
  protected abstract repository: BaseRepository<T>;
  protected abstract tableName: string;

  protected createSchema?: ZodSchema<CreateDTO>;
  protected updateSchema?: ZodSchema<UpdateDTO>;

  protected async beforeCreate(
    data: CreateDTO,
    ctx: ServiceContext
  ): Promise<CreateDTO> {
    return data;
  }

  protected async afterCreate(record: T, ctx: ServiceContext): Promise<void> {}

  protected async beforeUpdate(
    id: string,
    data: UpdateDTO,
    ctx: ServiceContext
  ): Promise<UpdateDTO> {
    return data;
  }

  protected async afterUpdate(record: T, ctx: ServiceContext): Promise<void> {}

  protected async beforeDelete(
    id: string,
    ctx: ServiceContext
  ): Promise<void> {}

  protected async afterDelete(record: T, ctx: ServiceContext): Promise<void> {}

  async create(data: CreateDTO, ctx: ServiceContext): Promise<T> {
    if (this.createSchema) {
      const result = this.createSchema.safeParse(data);
      if (!result.success) {
        const messages = result.error.issues.map((issue) => issue.message)[0];
        throw new AppError(messages, StatusCodes.BAD_REQUEST);
      }
      data = result.data;
    }

    const processedData = await this.beforeCreate(data, ctx);

    const record = await this.repository.transaction(async (tx) => {
      const created = await this.repository.create(processedData as Partial<T>);

      if (ctx.req) {
        this.log(ctx.req, {
          operation: LogOperation.CREATE,
          category: LogCategory.WRITE,
          recordId: (created as any).id,
          newState: created as Record<string, any>,
          userId: ctx.userId,
          userEmail: ctx.userEmail || "system",
          requestId: ctx.requestId,
        });
      }

      return created;
    });

    await this.afterCreate(record, ctx);

    return record;
  }

  async findById(
    id: string,
    ctx: ServiceContext,
    include?: Record<string, boolean | object>
  ): Promise<T> {
    const record = await this.repository.findByIdOrThrow(id, include);
    return record;
  }

  async findMany(
    options: FindManyOptions,
    ctx: ServiceContext
  ): Promise<PaginatedResult<T>> {
    return this.repository.findMany(options);
  }

  async update(id: string, data: UpdateDTO, ctx: ServiceContext): Promise<T> {
    if (this.updateSchema) {
      const result = this.updateSchema.safeParse(data);
      if (!result.success) {
        const messages = result.error.issues.map((issue) => issue.message)[0];
        throw new AppError(messages, StatusCodes.BAD_REQUEST);
      }
      data = result.data;
    }

    const previousState = await this.repository.findByIdOrThrow(id);
    const processedData = await this.beforeUpdate(id, data, ctx);

    const record = await this.repository.transaction(async (tx) => {
      const updated = await this.repository.update(
        id,
        processedData as Partial<T>
      );

      const changedFields = this.getChangedFields(
        previousState as Record<string, any>,
        updated as Record<string, any>
      );

      if (ctx.req) {
        this.log(ctx.req, {
          operation: LogOperation.UPDATE,
          category: LogCategory.WRITE,
          recordId: id,
          previousState: previousState as Record<string, any>,
          newState: updated as Record<string, any>,
          changedFields,
          userId: ctx.userId,
          userEmail: ctx.userEmail || "system",
          requestId: ctx.requestId,
        });
      }

      return updated;
    });

    await this.afterUpdate(record, ctx);

    return record;
  }

  async findDeleted(
    options: FindManyOptions,
    ctx: ServiceContext
  ): Promise<PaginatedResult<T>> {
    return this.repository.findDeleted(options);
  }

  async findDeletedById(
    id: string,
    ctx: ServiceContext,
    include?: Record<string, boolean | object>
  ): Promise<T> {
    return this.repository.findDeletedByIdOrThrow(id, include);
  }

  async delete(
    id: string,
    ctx: ServiceContext,
    soft: boolean = true
  ): Promise<T> {
    await this.beforeDelete(id, ctx);

    const previousState = await this.repository.findByIdOrThrow(id);

    const record = await this.repository.transaction(async (tx) => {
      const deleted = soft
        ? await this.repository.softDelete(id)
        : await this.repository.delete(id);

      if (ctx.req) {
        this.log(ctx.req, {
          operation: LogOperation.DELETE,
          category: LogCategory.WRITE,
          recordId: id,
          previousState: previousState as Record<string, any>,
          userId: ctx.userId,
          userEmail: ctx.userEmail || "system",
          requestId: ctx.requestId,
        });
      }

      return deleted;
    });

    await this.afterDelete(record, ctx);

    return record;
  }

  async restore(id: string, ctx: ServiceContext): Promise<T> {
    const record = await this.repository.restore(id);

    if (ctx.req) {
      this.log(ctx.req, {
        operation: LogOperation.UPDATE,
        category: LogCategory.WRITE,
        recordId: id,
        newState: record as Record<string, any>,
        changedFields: ["deletedAt"],
        userId: ctx.userId,
        userEmail: ctx.userEmail || "system",
        requestId: ctx.requestId,
      });
    }

    return record;
  }

  protected log(
    req: Request,
    options: {
      operation: LogOperation;
      category: LogCategory;
      recordId: string;
      previousState?: Record<string, any> | null;
      newState?: Record<string, any> | null;
      changedFields?: string[];
      userId?: string;
      userEmail: string;
      requestId?: string;
    }
  ): void {
    logUserActivity(req, {
      operation: options.operation,
      category: options.category,
      tableName: this.tableName,
      recordId: options.recordId,
      previousState: (options.previousState as InputJsonValue) || null,
      newState: options.newState || null,
      changedFields: options.changedFields || [],
      userId: options.userId,
      userEmail: options.userEmail,
      requestId: options.requestId,
    });
  }

  protected getChangedFields(
    previous: Record<string, any>,
    current: Record<string, any>
  ): string[] {
    const changed: string[] = [];

    for (const key of Object.keys(current)) {
      if (["createdAt", "updatedAt", "deletedAt"].includes(key)) continue;

      if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
        changed.push(key);
      }
    }

    return changed;
  }
}
