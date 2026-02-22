import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import prisma from "@models/index.model";
import getUserPermissions from "src/modules/users/utilites/getUserPermissions.util";
import { catchAsync } from "@utils/catchAsync.util";
import { JWT_SECRET } from "@utils/enviromentVariablesCheck.util";
import { applyFtpUrlTransform } from "@utils/applyFtpUrl.util";
import { Status } from "src/generated/prisma";

const protect = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(
        new AppError("error.auth.no_token", StatusCodes.UNAUTHORIZED)
      );
    }

    let decodedToken: jwt.JwtPayload;
    try {
      decodedToken = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return next(
          new AppError("error.auth.token_expired", StatusCodes.UNAUTHORIZED)
        );
      }
      return next(
        new AppError("error.auth.invalid_token", StatusCodes.UNAUTHORIZED)
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: decodedToken.id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        surname: true,
        employeeId: true,
        phoneNumber: true,
        status: true,
        gender: true,
        passwordChangedAt: true,
        profilePictureUrl: true,
        deactivatedUntil: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!user) {
      return next(
        new AppError("error.auth.user_not_found", StatusCodes.UNAUTHORIZED)
      );
    }

    if (user.status === Status.TERMINATED) {
      return next(
        new AppError("error.auth.account_not_active", StatusCodes.FORBIDDEN)
      );
    }

    if (user.deactivatedUntil && user.deactivatedUntil.getTime() > Date.now()) {
      throw new AppError(
        "error.auth.account_temporarily_not_active",
        StatusCodes.FORBIDDEN
      );
    }

    if (!decodedToken.iat) {
      return next(
        new AppError("error.auth.invalid_token", StatusCodes.UNAUTHORIZED)
      );
    }

    if (
      user.passwordChangedAt &&
      Math.floor(user.passwordChangedAt.getTime() / 1000) > decodedToken.iat
    ) {
      return next(
        new AppError("error.auth.password_changed", StatusCodes.UNAUTHORIZED)
      );
    }

    const { passwordChangedAt, ...safeUser } = user;

    res.locals.user = {
      ...safeUser,
      profilePictureUrl: applyFtpUrlTransform(user.profilePictureUrl),
      permissions: await getUserPermissions(user.id),
    };

    next();
  }
);

export default protect;
