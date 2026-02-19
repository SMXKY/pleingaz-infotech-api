import { BaseService } from "src/base/BaseService";
import { UserRepository } from "./user.repository";
import {
  createUserSchema,
  updateUserSchema,
  CreateUserInput,
  UpdateUserInput,
} from "./user.schema";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import { $Enums, TokenType, User } from "src/generated/prisma";
import { prisma } from "src";
import path from "path";
import { readFileSync } from "fs";
import generateEmployeeId from "./utilites/generateEmployeeId.util";
import crypto from "crypto";
import argon2 from "argon2";
import { baseUrl, frontEndUrl } from "@utils/enviromentVariablesCheck.util";
import { sendEmail } from "@utils/sendEmail.util";

export class UserService extends BaseService<
  User,
  CreateUserInput,
  UpdateUserInput
> {
  protected repository: UserRepository;
  protected tableName = "users";
  protected createSchema = createUserSchema;
  protected updateSchema = updateUserSchema;

  constructor() {
    super();
    this.repository = new UserRepository();
  }

  protected async beforeCreate(
    data: CreateUserInput
  ): Promise<CreateUserInput> {
    return data;
  }

  protected async beforeUpdate(
    id: string,
    data: UpdateUserInput,
    ctx: ServiceContext
  ): Promise<UpdateUserInput> {
    return data;
  }

  protected async beforeDelete(id: string, ctx: ServiceContext): Promise<void> {
    return;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.repository.findByUserName(username);
  }

  async findActiveUsers(ctx: ServiceContext): Promise<User[]> {
    return this.repository.findActiveUsers();
  }

  async findTerminatedUsers(ctx: ServiceContext): Promise<User[]> {
    return this.repository.findTerminatedUsers();
  }

  async delete(
    id: string,
    ctx: ServiceContext,
    soft: boolean = true
  ): Promise<User> {
    if (soft) {
      return this.repository.softDelete(id, ["name"]);
    }
    return this.repository.delete(id);
  }

  async createEmployee(
    form: CreateUserInput,
    ctx: ServiceContext
  ): Promise<Partial<User>> {
    const config = await prisma.adminConfig.findFirst();
    if (!config) {
      throw new AppError(
        "error.config.not_found",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const userExist = await prisma.user.findUnique({
      where: { email: form.email },
    });

    if (userExist) {
      throw new AppError("error.user.already_exists", StatusCodes.CONFLICT);
    }

    const role = await prisma.role.findUnique({
      where: { id: form.roleId },
    });

    if (!role) {
      throw new AppError("error.role.not_found", StatusCodes.BAD_REQUEST);
    }

    const department = await prisma.department.findUnique({
      where: { id: form.departmentId },
    });

    if (!department) {
      throw new AppError("error.department.not_found", StatusCodes.BAD_REQUEST);
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          ...form,
          employeeId: await generateEmployeeId(tx, config.companyPrefix),
          dob: form.dob ? new Date(form.dob) : null,
          hireDate: new Date(form.hireDate),
        },
        select: {
          id: true,
          email: true,
          name: true,
          surname: true,
          employeeId: true,
          phoneNumber: true,
          status: true,
          gender: true,
          address: true,
          hireDate: true,
          createdAt: true,
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

      const tokenString = crypto.randomBytes(32).toString("hex");
      const tokenHash = await argon2.hash(tokenString);

      await tx.userToken.create({
        data: {
          userId: user.id,
          tokenHash,
          type: TokenType.PASSWORD_SETUP,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const tokenUrl = `${frontEndUrl}/set-credentials?token=${tokenString}`;

      const templatePath = path.join(
        __dirname,
        "../../public/templates/account_creation.template.html"
      );

      const emailTemplate = readFileSync(templatePath, "utf-8")
        .replace(/{{logoUrl}}/g, config.logoUrl || `${baseUrl}/assets/logo.png`)
        .replace(/{{employeeName}}/g, `${user.name} ${user.surname}`)
        .replace(/{{employeeId}}/g, user.employeeId)
        .replace(/{{employeeEmail}}/g, user.email)
        .replace(/{{department}}/g, user.department.name)
        .replace(/{{role}}/g, user.role.name)
        .replace(/{{setPasswordLink}}/g, tokenUrl)
        .replace(/{{supportEmail}}/g, config.supportEmail)
        .replace(/{{supportPhone}}/g, config.companyPhoneNumber)
        .replace(/{{websiteUrl}}/g, frontEndUrl)
        .replace(/{{privacyUrl}}/g, `${frontEndUrl}/privacy`)
        .replace(/{{termsUrl}}/g, `${frontEndUrl}/terms`)
        .replace(/{{year}}/g, `${new Date().getFullYear()}`);

      await sendEmail(
        user.email,
        "Bienvenue chez INFOTECH S.A - Configurez votre compte",
        "",
        emailTemplate
      );

      if (ctx.req) {
        await tx.activityLog.create({
          data: {
            userId: ctx.userId || null,
            userEmail: ctx.userEmail || "system",
            operation: "CREATE",
            category: "WRITE",
            tableName: "users",
            recordId: user.id,
            newState: user,
            changedFields: [],
            status: "SUCCESS",
          },
        });
      }

      return user;
    });

    return result;
  }
}
