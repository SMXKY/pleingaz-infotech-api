import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { RoleService } from "./role.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { Role } from "src/generated/prisma";

export class RoleController extends BaseController<Role> {
  protected service: RoleService;

  constructor() {
    super();
    this.service = new RoleService();
  }

  findActive = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req);
      const roles = await this.service.findActiveRoles(ctx);
      appResponder(StatusCodes.OK, roles, res);
    } catch (error) {
      next(error);
    }
  };

  findWithPermissions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req);
      const role = await this.service.findWithPermissions(
        req.params.id as string,
        ctx
      );
      appResponder(StatusCodes.OK, { role }, res);
    } catch (error) {
      next(error);
    }
  };
}
