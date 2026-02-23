import { BaseService } from "src/base/BaseService";
import { Response, Request } from "express";
import { PermissionRepository } from "./permission.repository";
import { LogCategory, LogOperation } from "@appTypes/log.type";
import {
  createPermissionSchema,
  updatePermissionSchema,
  CreatePermissionInput,
  UpdatePermissionInput,
  PermissionOverideInput,
} from "./permission.schema";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import { Permission, Status } from "src/generated/prisma";
import { prisma } from "src";
import { permissionCache } from "../users/utilites/getUserPermissions.util";

export class PermissionService extends BaseService<
  Permission,
  CreatePermissionInput,
  UpdatePermissionInput
> {
  protected repository: PermissionRepository;
  protected tableName = "permissions";
  protected createSchema = createPermissionSchema;
  protected updateSchema = updatePermissionSchema;

  constructor() {
    super();
    this.repository = new PermissionRepository();
  }

  protected async beforeCreate(
    data: CreatePermissionInput,
    ctx: ServiceContext
  ): Promise<CreatePermissionInput> {
    return data;
  }

  protected async beforeUpdate(
    id: string,
    data: UpdatePermissionInput,
    ctx: ServiceContext
  ): Promise<UpdatePermissionInput> {
    return data;
  }

  async findByCode(code: string): Promise<Permission | null> {
    return this.repository.findByCode(code);
  }

  async findWildCardPermissions(ctx: ServiceContext): Promise<Permission[]> {
    return this.repository.findWildCardPermissions();
  }

  async delete(
    id: string,
    ctx: ServiceContext,
    soft: boolean = true
  ): Promise<Permission> {
    if (soft) {
      return this.repository.softDelete(id, ["name"]);
    }
    return this.repository.delete(id);
  }

  async permissionOverride(
    data: PermissionOverideInput,
    ctx: ServiceContext,
    res: Response
  ): Promise<{ message: string }> {
    const { userId, permissionId, reason, expiresAt } = data;

    const [user, permission] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId, deletedAt: null },
        select: { id: true, status: true, isSystem: true },
      }),
      prisma.permission.findUnique({
        where: { id: permissionId, deletedAt: null },
        select: { id: true, code: true },
      }),
    ]);

    if (!user)
      throw new AppError("error.user.not_found", StatusCodes.NOT_FOUND);
    if (user.isSystem)
      throw new AppError(
        "error.user.system_user_immutable",
        StatusCodes.FORBIDDEN
      );
    if (user.status === Status.TERMINATED)
      throw new AppError("error.user.terminated", StatusCodes.CONFLICT);
    if (user.status === Status.SUSPENDED)
      throw new AppError("error.user.account_suspended", StatusCodes.CONFLICT);
    if (!permission)
      throw new AppError("error.permission.not_found", StatusCodes.NOT_FOUND);

    const existingOverride = await prisma.permissionOverride.findFirst({
      where: {
        userId,
        permissionId,
        isGranted: true,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (existingOverride) {
      throw new AppError(
        "error.permission.override_already_active",
        StatusCodes.CONFLICT
      );
    }

    const isTemporary = !!expiresAt;

    await prisma.permissionOverride.upsert({
      where: { userId_permissionId: { userId, permissionId } },
      create: {
        permissionId,
        userId,
        reason,
        expiresAt: expiresAt || null,
        isGranted: true,
        isTemporary,
        createdById: ctx.userId || res.locals.user.id,
      },
      update: {
        reason,
        expiresAt: expiresAt || null,
        isGranted: true,
        isTemporary,
        deletedAt: null,
        createdById: ctx.userId || res.locals.user.id,
      },
    });

    permissionCache.delete(userId);

    this.log(ctx.req as Request, {
      operation: LogOperation.CREATE,
      category: LogCategory.WRITE,
      recordId: userId,
      previousState: null,
      newState: {
        permissionId,
        permission: permission.code,
        expiresAt: expiresAt || null,
      },
      changedFields: ["permissionOverride"],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return { message: "success.permission.override_assigned_to_user" };
  }

  async revokePermissionOverride(
    data: { userId: string; permissionId: string },
    ctx: ServiceContext
  ): Promise<{ message: string }> {
    const { userId, permissionId } = data;

    const override = await prisma.permissionOverride.findFirst({
      where: {
        userId,
        permissionId,
        isGranted: true,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true },
    });

    if (!override) {
      throw new AppError(
        "error.permission.override_not_found",
        StatusCodes.NOT_FOUND
      );
    }

    await prisma.permissionOverride.update({
      where: { id: override.id },
      data: {
        isGranted: false,
        deletedAt: new Date(),
      },
    });

    permissionCache.delete(userId);

    this.log(ctx.req as Request, {
      operation: LogOperation.UPDATE,
      category: LogCategory.WRITE,
      recordId: userId,
      previousState: { permissionId, isGranted: true },
      newState: { permissionId, isGranted: false },
      changedFields: ["permissionOverride"],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return { message: "success.permission.override_revoked" };
  }
}
