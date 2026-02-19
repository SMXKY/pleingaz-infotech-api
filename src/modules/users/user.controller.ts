import { Request, Response, NextFunction, response } from "express";
import { BaseController } from "src/base/BaseController";
import { UserService } from "./user.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { User } from "src/generated/prisma";
import { catchAsync } from "@utils/catchAsync.util";
import {
  CreateUserInput,
  PasswordResetSchema,
  setupAccountSchema,
} from "./user.schema";
import { AppError } from "@utils/AppError.util";
import t from "@utils/translate.util";

export class UserController extends BaseController<User> {
  protected service: UserService;

  constructor() {
    super();
    this.service = new UserService();
  }

  findActive = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req);
      const users = await this.service.findActiveUsers(ctx);
      appResponder(StatusCodes.OK, users, res);
    } catch (error) {
      next(error);
    }
  };

  findByUserName = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const username = req.params.username;
      const ctx = this.getContext(req);
      const user = await this.service.findByUsername(username as string);

      appResponder(StatusCodes.OK, user as object, res);
    } catch (err) {
      next(err);
    }
  };

  findTerminatedUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req);
      const users = await this.service.findTerminatedUsers(ctx);
      appResponder(StatusCodes.OK, users, res);
    } catch (error) {
      next(error);
    }
  };

  createEmployee = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const ctx = this.getContext(req);
      const form = req.body;

      const result = await this.service.createEmployee(form, ctx);

      appResponder(StatusCodes.CREATED, result as CreateUserInput, res);
    }
  );

  setupAccountCredentials = catchAsync(async (req: Request, res: Response) => {
    const validation = setupAccountSchema.safeParse(req.body);
    if (!validation.success) {
      const message = validation.error.issues[0].message;
      throw new AppError(message, StatusCodes.BAD_REQUEST);
    }

    const ctx = this.getContext(req);
    const result = await this.service.setupAccountCredentials(
      validation.data,
      ctx
    );

    appResponder(
      StatusCodes.OK,
      {
        message: t(res.locals.lang, result.message),
      },
      res
    );
  });

  createSetupToken = catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const ctx = this.getContext(req);
    const result = await this.service.createSetupToken(userId as string, ctx);
    appResponder(
      StatusCodes.OK,
      {
        message: t(res.locals.lang, result.message),
      },
      res
    );
  });

  login = catchAsync(async (req: Request, res: Response) => {
    const ctx = this.getContext(req);
    const result = await this.service.login(req.body, ctx);
    appResponder(StatusCodes.OK, result, res);
  });

  forgotPassword = catchAsync(async (req: Request, res: Response) => {
    const ctx = this.getContext(req);
    const email = req.body.email;

    if (!email) {
      throw new AppError(
        "error.validation.invalid_email",
        StatusCodes.BAD_REQUEST
      );
    }
    const result = await this.service.forgotPassword(email, ctx);
    appResponder(
      StatusCodes.OK,
      {
        message: t(res.locals.lang, result.message),
      },
      res
    );
  });

  resetPassword = catchAsync(async (req: Request, res: Response) => {
    const validation = PasswordResetSchema.safeParse(req.body);
    if (!validation.success) {
      const message = validation.error.issues[0].message;
      throw new AppError(message, StatusCodes.BAD_REQUEST);
    }

    const ctx = this.getContext(req);
    const result = await this.service.resetPassword(validation.data, ctx);

    appResponder(
      StatusCodes.OK,
      {
        message: t(res.locals.lang, result.message),
      },
      res
    );
  });
}
