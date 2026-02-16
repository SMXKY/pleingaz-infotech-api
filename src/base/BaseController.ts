import { Request, Response, NextFunction } from "express";
import { BaseService } from "./BaseService";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import {
  ServiceContext,
  FindManyOptions,
  FilterParams,
} from "../appTypes/base.types";
import { AppError } from "@utils/AppError.util";

export abstract class BaseController<T> {
  protected abstract service: BaseService<T, any, any>;

  protected getContext(req: Request): ServiceContext {
    return {
      req,
      userId: (req as any).user?.id,
      userEmail: (req as any).user?.email,
      requestId: req.headers["x-request-id"] as string,
    };
  }

  create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req);
      const record = await this.service.create(req.body, ctx);
      appResponder(StatusCodes.CREATED, record as object, res);
    } catch (error) {
      next(error);
    }
  };

  findById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req);
      const include = this.parseInclude(req.query.include as string);

      const rawId = req.params.id;

      let id: string | undefined;

      if (Array.isArray(rawId)) {
        id = typeof rawId[0] === "string" ? rawId[0] : undefined;
      } else if (typeof rawId === "string") {
        id = rawId;
      }

      if (!id) {
        throw new AppError(
          "error.validation.id_required",
          StatusCodes.BAD_REQUEST
        );
      }

      const record = await this.service.findById(id, ctx, include);
      appResponder(StatusCodes.OK, record as object, res);
    } catch (error) {
      next(error);
    }
  };

  findMany = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req);
      const options = this.parseFindManyOptions(req);
      const result = await this.service.findMany(options, ctx);
      appResponder(StatusCodes.OK, result.data, res, result.meta);
    } catch (error) {
      next(error);
    }
  };

  update = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req);

      const rawId = req.params.id;

      let id: string | undefined;

      if (Array.isArray(rawId)) {
        id = typeof rawId[0] === "string" ? rawId[0] : undefined;
      } else if (typeof rawId === "string") {
        id = rawId;
      }

      if (!id) {
        return next(
          new AppError("error.validation.id_required", StatusCodes.BAD_REQUEST)
        );
      }

      const record = await this.service.update(id, req.body, ctx);
      appResponder(StatusCodes.OK, record as object, res);
    } catch (error) {
      next(error);
    }
  };

  delete = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req);
      const soft = req.query.hard !== "true";

      const rawId = req.params.id;

      let id: string | undefined;

      if (Array.isArray(rawId)) {
        id = typeof rawId[0] === "string" ? rawId[0] : undefined;
      } else if (typeof rawId === "string") {
        id = rawId;
      }

      if (!id) {
        throw new AppError(
          "error.validation.id_required",
          StatusCodes.BAD_REQUEST
        );
      }

      await this.service.delete(id, ctx, soft);
      appResponder(StatusCodes.OK, { message: "resource.deleted" }, res);
    } catch (error) {
      next(error);
    }
  };

  restore = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req);

      const rawId = req.params.id;

      let id: string | undefined;

      if (Array.isArray(rawId)) {
        id = typeof rawId[0] === "string" ? rawId[0] : undefined;
      } else if (typeof rawId === "string") {
        id = rawId;
      }

      if (!id) {
        throw new AppError(
          "error.validation.id_required",
          StatusCodes.BAD_REQUEST
        );
      }

      const record = await this.service.restore(id, ctx);
      appResponder(StatusCodes.OK, record as object, res);
    } catch (error) {
      next(error);
    }
  };

  protected parseFindManyOptions(req: Request): FindManyOptions {
    const { page, limit, sortBy, sortOrder, include, ...filters } = req.query;

    const parsedFilters: FilterParams = normalizeQuery(filters);

    return {
      pagination: {
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      },
      filters: parsedFilters,
      include: this.parseInclude(include as string),
    };
  }

  protected parseInclude(
    include?: string
  ): Record<string, boolean> | undefined {
    if (!include) return undefined;

    const fields = include.split(",").map((f) => f.trim());
    const result: Record<string, boolean> = {};

    for (const field of fields) {
      result[field] = true;
    }

    return result;
  }
}

function normalizeQuery(query: { [key: string]: any }): FilterParams {
  const filters: FilterParams = {};

  for (const key in query) {
    const value = query[key];

    if (Array.isArray(value)) {
      const first = value[0];
      if (
        typeof first === "string" ||
        typeof first === "number" ||
        typeof first === "boolean"
      ) {
        filters[key] = first;
      } else {
        filters[key] = undefined;
      }
    } else if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      filters[key] = value;
    } else {
      filters[key] = undefined;
    }
  }

  return filters;
}
