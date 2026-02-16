import { NextFunction, Request, Response } from "express";
import { AppError } from "@utils/AppError.util";
import t from "@utils/translate.util";

const developmentResponse = (err: AppError, req: Request, res: Response) => {
  res.status(err.statusCode).json({
    ok: false,
    status: err.status,
    message: t(res.locals.lang, err.messageKey, err.meta),
    error: err,
    stack: err.stack || "No stack trace available",
    path: req.originalUrl,
    method: req.method,
  });
};

const productionResponse = (err: AppError, req: Request, res: Response) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      ok: false,
      status: err.status,
      message: t(res.locals.lang, err.messageKey, err.meta),
    });
  } else {
    res.status(500).json({
      ok: false,
      status: "error",
      message: t(res.locals.lang, "error.unexpected"),
    });
  }
};

export const globalErrorController = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.headersSent) {
    return next(err);
  }

  const error = AppError.from(err);

  console.error(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`,
    {
      statusCode: error.statusCode,
      messageKey: error.messageKey,
      meta: error.meta,
      userId: (req as any).user?.id || "unauthenticated",
      ip: req.ip,
      stack: error.stack,
    }
  );

  if (process.env.NODE_ENV === "production") {
    productionResponse(error, req, res);
  } else {
    developmentResponse(error, req, res);
  }
};
