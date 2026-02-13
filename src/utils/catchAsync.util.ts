import { NextFunction, Request, Response } from "express";
import { AppError } from "./AppError.util";
import { StatusCodes } from "http-status-codes";

export const catchAsync = (
  func: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    func(req, res, next).catch((err: any) => {
      console.log(err);

      const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
      const message = err.message || "error.server_error";

      next(new AppError(message, statusCode));
    });
  };
};
