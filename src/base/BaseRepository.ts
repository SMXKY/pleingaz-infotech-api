import prisma from "@models/index.model";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import {
  PaginationParams,
  PaginatedResult,
  FilterParams,
  FindManyOptions,
} from "@appTypes/base.types";
import { Prisma } from "src/generated/prisma";

export abstract class BaseRepository<T> {
  protected prisma = prisma;
  protected abstract modelName: string;

  protected get model(): any {
    return (this.prisma as any)[this.modelName];
  }

  async create(data: Partial<T>): Promise<T> {
    return this.model.create({ data });
  }

  async findById(
    id: string,
    include?: Record<string, boolean | object>
  ): Promise<T | null> {
    return this.model.findUnique({
      where: { id },
      include,
    });
  }

  async findByIdOrThrow(
    id: string,
    include?: Record<string, boolean | object>
  ): Promise<T> {
    const record = await this.findById(id, include);
    if (!record) {
      throw new AppError("error.db.not_found", StatusCodes.NOT_FOUND);
    }
    return record;
  }

  async findOne(
    where: Partial<T>,
    include?: Record<string, boolean | object>
  ): Promise<T | null> {
    return this.model.findFirst({
      where: this.addSoftDeleteFilter(where),
      include,
    });
  }

  async findMany(options: FindManyOptions = {}): Promise<PaginatedResult<T>> {
    const { pagination = {}, filters = {}, include, select } = options;

    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;
    const sortBy = pagination.sortBy || "createdAt";
    const sortOrder = pagination.sortOrder || "desc";

    const where = this.buildWhereClause(filters);

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        include,
        select,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.model.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findAll(
    where: Partial<T> = {},
    include?: Record<string, boolean | object>
  ): Promise<T[]> {
    return this.model.findMany({
      where: this.addSoftDeleteFilter(where),
      include,
    });
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    await this.findByIdOrThrow(id);
    return this.model.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<T> {
    await this.findByIdOrThrow(id);
    return this.model.delete({
      where: { id },
    });
  }

  async softDelete(id: string): Promise<T> {
    await this.findByIdOrThrow(id);
    return this.model.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string): Promise<T> {
    return this.model.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async exists(where: Partial<T>): Promise<boolean> {
    const count = await this.model.count({
      where: this.addSoftDeleteFilter(where),
    });
    return count > 0;
  }

  async count(where: Partial<T> = {}): Promise<number> {
    return this.model.count({
      where: this.addSoftDeleteFilter(where),
    });
  }

  async transaction<R>(
    fn: (tx: Prisma.TransactionClient) => Promise<R>
  ): Promise<R> {
    return this.prisma.$transaction(fn);
  }

  protected buildWhereClause(filters: FilterParams): Record<string, any> {
    const where: Record<string, any> = { deletedAt: null };

    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === "") continue;

      if (typeof value === "string" && !this.isUuid(value)) {
        where[key] = { contains: value, mode: "insensitive" };
      } else {
        where[key] = value;
      }
    }

    return where;
  }

  protected addSoftDeleteFilter(where: Partial<T>): Record<string, any> {
    return { ...where, deletedAt: null };
  }

  private isUuid(value: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }
}
