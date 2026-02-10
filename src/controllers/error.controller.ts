import { NextFunction, Request, Response } from "express";
import { AppError } from "@utils/AppError.util";

const developmentResponse = (
  err: Error | AppError,
  req: Request,
  res: Response
) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const status = err instanceof AppError ? err.status : "error";
  const message =
    err instanceof AppError ? err.message : "Something went wrong";

  res.status(statusCode).json({
    ok: false,
    status,
    message,
    error: err,
    stack: err.stack || "No stack trace available",
    path: req.originalUrl,
    method: req.method,
  });
};

const productionResponse = (
  err: Error | AppError,
  req: Request,
  res: Response
) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const status = err instanceof AppError ? err.status : "error";
  const message =
    err instanceof AppError ? err.message : "Something went wrong";

  if (err instanceof AppError) {
    res.status(statusCode).json({
      ok: false,
      status,
      message,
    });
  } else {
    res.status(500).json({
      ok: false,
      status: "Server error",
      message: "An unexpected error occurred. Please try again later.",
    });
  }
};

export const globalErrorController = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "Server error";

  if (res.headersSent) {
    return next(err);
  }

  console.error(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`,
    {
      statusCode: err.statusCode,
      message: err.message,
      userId: (req as any).user?.id || "unauthenticated",
      ip: req.ip,
      stack: err.stack,
    }
  );

  if (process.env.NODE_ENV === "production") {
    productionResponse(err, req, res);
  } else {
    developmentResponse(err, req, res);
  }
};
