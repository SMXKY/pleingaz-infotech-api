import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { UserService } from "./user.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { User } from "src/generated/prisma";

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
}
