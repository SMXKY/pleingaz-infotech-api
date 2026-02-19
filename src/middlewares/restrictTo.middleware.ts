import { Request, Response, NextFunction } from "express";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";

const restrictTo = (...permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!res.locals.user) {
      return next(
        new AppError("error.auth.not_authenticated", StatusCodes.UNAUTHORIZED)
      );
    }

    const hasPermission = permissions.some((perm) =>
      res.locals.user.permissions.includes(perm)
    );

    if (!hasPermission) {
      return next(
        new AppError(
          "error.auth.insufficient_permissions",
          StatusCodes.FORBIDDEN
        )
      );
    }

    next();
  };
};

export default restrictTo;
