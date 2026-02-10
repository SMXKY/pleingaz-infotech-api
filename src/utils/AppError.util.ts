import { Prisma } from "src/generated/prisma/client";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);

    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Converts any error into a well-formatted AppError.
   */
  static from(err: any): AppError {
    if (err instanceof AppError) return err;

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const fields =
        (err.meta?.target as string[])?.join(", ") || "unknown field";
      return new AppError(
        `Duplicate value: A record with that ${fields} already exists. Please use a different value for ${fields}.`,
        409
      );
    }

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      const cause =
        (err.meta?.cause as string) || "The requested record does not exist";
      return new AppError(cause, 404);
    }

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      const field = (err.meta?.field_name as string) || "related record";
      return new AppError(
        `Invalid reference: The ${field} you are trying to link does not exist.`,
        400
      );
    }

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2011"
    ) {
      const field = (err.meta?.constraint as string) || "required field";
      return new AppError(
        `Missing required field: ${field} cannot be null or empty.`,
        400
      );
    }

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2000"
    ) {
      const field = (err.meta?.column_name as string) || "field";
      return new AppError(
        `Value too long for ${field}. Please shorten your input.`,
        400
      );
    }

    // Invalid data type / validation error in query
    if (err instanceof Prisma.PrismaClientValidationError) {
      const cleanMessage =
        err.message.split("\n").pop()?.trim() || "Invalid data provided";
      return new AppError(`Validation error: ${cleanMessage}`, 400);
    }

    if (err instanceof Prisma.PrismaClientInitializationError) {
      return new AppError(
        "Unable to connect to the database. Please try again later.",
        503,
        false
      );
    }

    if (err instanceof Prisma.PrismaClientRustPanicError) {
      return new AppError(
        "A critical database error occurred. Please try again later.",
        500,
        false
      );
    }

    if (err.name === "JsonWebTokenError") {
      return new AppError(
        "Invalid authentication token. Please log in again.",
        401
      );
    }

    if (err.name === "TokenExpiredError") {
      return new AppError(
        "Your session has expired. Please log in again.",
        401
      );
    }

    if (err instanceof SyntaxError && "body" in err) {
      return new AppError(
        "Invalid JSON in request body. Please check your request format.",
        400
      );
    }

    if (err.type === "entity.too.large") {
      return new AppError(
        "Request payload is too large. Please reduce the size of your upload.",
        413
      );
    }

    return new AppError(
      "An unexpected error occurred. Please try again later.",
      500,
      false
    );
  }
}
