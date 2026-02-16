import { Request, Response, NextFunction } from "express";

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface FilterParams {
  [key: string]: string | number | boolean | undefined;
}

export interface FindManyOptions {
  pagination?: PaginationParams;
  filters?: FilterParams;
  include?: Record<string, boolean | object>;
  select?: Record<string, boolean>;
}

export interface ServiceContext {
  req?: Request;
  userId?: string;
  userEmail?: string;
  requestId?: string;
}

export type ControllerMethod = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;
