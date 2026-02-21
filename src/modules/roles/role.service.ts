import { BaseService } from "src/base/BaseService";
import { RoleRepository } from "./role.repository";
import {
  createRoleSchema,
  updateRoleSchema,
  CreateRoleInput,
  UpdateRoleInput,
  AssignRolePermissionInput,
} from "./role.schema";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import { Role } from "src/generated/prisma";
import { prisma } from "src";
import { permissionCache } from "../users/utilites/getUserPermissions.util";
import { UserStatus } from "@appTypes/user.types";
import { Request, Response } from "express";
import { LogCategory, LogOperation } from "@appTypes/log.type";

export class RoleService extends BaseService<
  Role,
  CreateRoleInput,
  UpdateRoleInput
> {
  protected repository: RoleRepository;
  protected tableName = "roles";
  protected createSchema = createRoleSchema;
  protected updateSchema = updateRoleSchema;

  constructor() {
    super();
    this.repository = new RoleRepository();
  }

  protected async beforeCreate(
    data: CreateRoleInput,
    ctx: ServiceContext
  ): Promise<CreateRoleInput> {
    return data;
  }

  protected async beforeUpdate(
    id: string,
    data: UpdateRoleInput,
    ctx: ServiceContext
  ): Promise<UpdateRoleInput> {
    return data;
  }

  protected async beforeDelete(id: string, ctx: ServiceContext): Promise<void> {
    const numberOfUsers = await this.repository.findUsersWithRole(id);
    if (numberOfUsers && numberOfUsers > 0) {
      throw new AppError("error.role.has_users", StatusCodes.BAD_REQUEST);
    }
  }

  async findByName(name: string): Promise<Role | null> {
    return this.repository.findByName(name);
  }

  async findActiveRoles(ctx: ServiceContext): Promise<Role[]> {
    return this.repository.findActiveRoles();
  }

  async findWithPermissions(
    id: string,
    ctx: ServiceContext
  ): Promise<Role | null> {
    return this.repository.findWithPermissions(id);
  }

  async delete(
    id: string,
    ctx: ServiceContext,
    soft: boolean = true
  ): Promise<Role> {
    if (soft) {
      return this.repository.softDelete(id, ["name"]);
    }
    return this.repository.delete(id);
  }

  async disableRole(
    id: string,
    ctx: ServiceContext
  ): Promise<{ message: string }> {
    if (!id) {
      throw new AppError(
        "error.role.role_id_required",
        StatusCodes.BAD_REQUEST
      );
    }

    const role = await prisma.role.findUnique({
      where: { id, deletedAt: null },
      include: {
        users: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
    });

    if (!role) {
      throw new AppError("error.role.not_found", StatusCodes.NOT_FOUND);
    }

    if (role.isSystem) {
      throw new AppError(
        "error.role.system_role_immutable",
        StatusCodes.FORBIDDEN
      );
    }

    if (!role.isActive) {
      throw new AppError("error.role.already_disabled", StatusCodes.CONFLICT);
    }

    const previousState = { ...role };

    const newState = await prisma.role.update({
      where: { id: role.id },
      data: { isActive: false },
    });

    for (const user of role.users) {
      permissionCache.delete(user.id);
    }

    this.log(ctx.req as Request, {
      operation: LogOperation.UPDATE,
      category: LogCategory.WRITE,
      recordId: role.id,
      previousState: previousState,
      newState: newState,
      changedFields: ["isActive"],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return { message: "success.role.disabled" };
  }

  async enableRole(
    id: string,
    ctx: ServiceContext
  ): Promise<{ message: string }> {
    const role = await prisma.role.findUnique({
      where: { id, deletedAt: null },
      include: {
        users: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
    });

    if (!role) {
      throw new AppError("error.role.not_found", StatusCodes.NOT_FOUND);
    }

    if (role.isSystem) {
      throw new AppError(
        "error.role.system_role_immutable",
        StatusCodes.FORBIDDEN
      );
    }

    if (role.isActive) {
      throw new AppError("error.role.already_enabled", StatusCodes.CONFLICT);
    }

    const previousState = { ...role };

    const newState = await prisma.role.update({
      where: { id: role.id },
      data: { isActive: true },
    });

    for (const user of role.users) {
      permissionCache.delete(user.id);
    }

    this.log(ctx.req as Request, {
      operation: LogOperation.UPDATE,
      category: LogCategory.WRITE,
      recordId: role.id,
      previousState: previousState,
      newState: newState,
      changedFields: ["isActive"],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return { message: "success.role.enabled" };
  }

  async assignRolePermissions(
    data: AssignRolePermissionInput,
    ctx: ServiceContext,
    res: Response
  ): Promise<{ message: string }> {
    const { permissionIds, roleId } = data;

    const role = await prisma.role.findUnique({
      where: { id: roleId, deletedAt: null },
    });

    if (!role) {
      throw new AppError("error.role.not_found", StatusCodes.NOT_FOUND);
    }

    if (role.isSystem) {
      throw new AppError(
        "error.role.system_role_immutable",
        StatusCodes.FORBIDDEN
      );
    }

    if (!role.isActive) {
      throw new AppError("error.role.inactive", StatusCodes.CONFLICT);
    }

    const permissions = await prisma.permission.findMany({
      where: { id: { in: permissionIds }, deletedAt: null },
      select: { id: true },
    });

    if (permissions.length !== permissionIds.length) {
      throw new AppError(
        "error.permission.one_or_more_not_found",
        StatusCodes.NOT_FOUND
      );
    }

    const previousState = await prisma.rolePermission.findMany({
      where: { roleId, deletedAt: null },
      select: { permissionId: true },
    });

    await prisma.$transaction(
      permissionIds.map((permissionId) =>
        prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId } },
          create: { roleId, permissionId, createdById: res.locals.user.id },
          update: { deletedAt: null },
        })
      )
    );

    const affectedUsers = await prisma.user.findMany({
      where: { roleId, deletedAt: null },
      select: { id: true },
    });

    for (const user of affectedUsers) {
      permissionCache.delete(user.id);
    }

    this.log(ctx.req as Request, {
      operation: LogOperation.CREATE,
      category: LogCategory.WRITE,
      recordId: role.id,
      previousState: null,
      newState: null,
      changedFields: [""],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return { message: "success.role.assigned_permissions" };
  }

  async assignUserRole(
    data: { userId: string; roleId: string },
    ctx: ServiceContext
  ): Promise<{ message: string }> {
    const { userId, roleId } = data;

    const [user, role] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId, deletedAt: null },
        select: { id: true, roleId: true, status: true, isSystem: true },
      }),
      prisma.role.findUnique({
        where: { id: roleId, deletedAt: null },
        select: { id: true, isActive: true },
      }),
    ]);

    if (!user) {
      throw new AppError("error.user.not_found", StatusCodes.NOT_FOUND);
    }

    if (user.isSystem) {
      throw new AppError(
        "error.user.system_user_immutable",
        StatusCodes.FORBIDDEN
      );
    }

    if (user.status === UserStatus.TERMINATED) {
      throw new AppError("error.user.terminated", StatusCodes.CONFLICT);
    }

    if (!role) {
      throw new AppError("error.role.not_found", StatusCodes.NOT_FOUND);
    }

    if (!role.isActive) {
      throw new AppError("error.role.inactive", StatusCodes.CONFLICT);
    }

    if (user.roleId === roleId) {
      throw new AppError("error.user.already_has_role", StatusCodes.CONFLICT);
    }

    const previousRoleId = user.roleId;

    await prisma.user.update({
      where: { id: userId },
      data: { roleId },
    });

    permissionCache.delete(userId);

    this.log(ctx.req as Request, {
      operation: LogOperation.UPDATE,
      category: LogCategory.WRITE,
      recordId: role.id,
      previousState: {
        roleId: previousRoleId,
      },
      newState: {
        roleId: roleId,
      },
      changedFields: [""],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return { message: "success.role.assigned_to_user" };
  }
}
