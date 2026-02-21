import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { PermissionService } from "./permission.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { Permission } from "src/generated/prisma";

export class PermissionController extends BaseController<Permission> {
  protected service: PermissionService;

  constructor() {
    super();
    this.service = new PermissionService();
  }

  findWildCards = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req);
      const Permissions = await this.service.findWildCardPermissions(ctx);
      appResponder(StatusCodes.OK, Permissions, res);
    } catch (error) {
      next(error);
    }
  };
}
