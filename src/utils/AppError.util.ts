import { Prisma } from "src/generated/prisma/client";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: string;
  public readonly isOperational: boolean;
  public readonly messageKey: string;
  public readonly meta?: Record<string, any>;

  constructor(
    messageKey: string,
    statusCode: number,
    meta?: Record<string, any>,
    isOperational = true
  ) {
    super(messageKey);

    this.messageKey = messageKey;
    this.meta = meta;
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static from(err: any): AppError {
    if (err instanceof AppError) return err;

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const fields =
        (err.meta?.target as string[])?.join(", ") || "unknown field";
      return new AppError("error.db.duplicate", 409, { fields });
    }

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      const cause =
        (err.meta?.cause as string) || "The requested record does not exist";
      return new AppError("error.db.not_found", 404, { cause });
    }

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      const field = (err.meta?.field_name as string) || "related record";
      return new AppError("error.db.invalid_reference", 400, { field });
    }

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2011"
    ) {
      const field = (err.meta?.constraint as string) || "required field";
      return new AppError("error.db.missing_field", 400, { field });
    }

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2000"
    ) {
      const field = (err.meta?.column_name as string) || "field";
      return new AppError("error.db.value_too_long", 400, { field });
    }

    if (err instanceof Prisma.PrismaClientValidationError) {
      const cleanMessage =
        err.message.split("\n").pop()?.trim() || "Invalid data provided";
      return new AppError("error.db.validation", 400, {
        details: cleanMessage,
      });
    }

    if (err instanceof Prisma.PrismaClientInitializationError) {
      return new AppError("error.db.unavailable", 503, undefined, false);
    }

    if (err instanceof Prisma.PrismaClientRustPanicError) {
      return new AppError("error.db.critical", 500, undefined, false);
    }

    if (err?.name === "JsonWebTokenError") {
      return new AppError("error.auth.invalid_token", 401);
    }

    if (err?.name === "TokenExpiredError") {
      return new AppError("error.auth.token_expired", 401);
    }

    if (err instanceof SyntaxError && "body" in err) {
      return new AppError("error.request.invalid_json", 400);
    }

    if (err?.type === "entity.too.large") {
      return new AppError("error.request.payload_too_large", 413);
    }

    return new AppError("error.unexpected", 500, undefined, false);
  }
}
