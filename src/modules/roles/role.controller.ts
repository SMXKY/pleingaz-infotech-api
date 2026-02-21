import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { RoleService } from "./role.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { Role } from "src/generated/prisma";
import { catchAsync } from "@utils/catchAsync.util";
import t from "@utils/translate.util";
import { assignRolePermissionSchema } from "./role.schema";
import { AppError } from "@utils/AppError.util";

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

  disableRole = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const ctx = this.getContext(req);
    const result = await this.service.disableRole(id as string, ctx);
    appResponder(
      StatusCodes.OK,
      {
        message: t(res.locals.lang, result.message),
      },
      res
    );
  });

  enableRole = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const ctx = this.getContext(req);
    const result = await this.service.enableRole(id as string, ctx);
    appResponder(
      StatusCodes.OK,
      {
        message: t(res.locals.lang, result.message),
      },
      res
    );
  });

  assignRolePermissions = catchAsync(async (req: Request, res: Response) => {
    const validation = assignRolePermissionSchema.safeParse(req.body);
    if (!validation.success) {
      const message = validation.error.issues[0].message;
      throw new AppError(message, StatusCodes.BAD_REQUEST);
    }

    const ctx = this.getContext(req);
    const result = await this.service.assignRolePermissions(
      validation.data,
      ctx,
      res
    );

    appResponder(
      StatusCodes.CREATED,
      {
        message: t(res.locals.lang, result.message),
      },
      res
    );
  });
}
