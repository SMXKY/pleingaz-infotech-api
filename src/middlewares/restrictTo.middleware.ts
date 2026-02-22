import { Request, Response, NextFunction } from "express";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { UserStatus } from "@appTypes/user.types";
import { Status } from "src/generated/prisma";

const restrictTo = (...permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!res.locals.user) {
      return next(
        new AppError("error.auth.not_authenticated", StatusCodes.UNAUTHORIZED)
      );
    }

    if (
      !res.locals.user.status ||
      res.locals.user.status === Status.SUSPENDED
    ) {
      return next(
        new AppError("error.user.account_suspended", StatusCodes.UNAUTHORIZED)
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
