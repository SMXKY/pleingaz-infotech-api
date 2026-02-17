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

export const baseUrl = process.env.BASE_URL;

if (process.env.BASE_URL) {
  throw new Error("Base url enviroment variable not set");
}

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
  ): Promise<User> {
    //Dont check for username, users will set their user names when seting thier passwords
    const userExist = await prisma.user.findUnique({
      where: {
        email: form.email,
      },
    });

    if (userExist) {
      throw new AppError(
        "error.user.user_already_exist",
        StatusCodes.BAD_REQUEST
      );
    }

    const role = await prisma.role.findUnique({
      where: {
        id: form.roleId,
      },
    });

    if (!role) {
      throw new AppError("error.role.role_not_found", StatusCodes.BAD_REQUEST);
    }

    const department = await prisma.department.findUnique({
      where: {
        id: form.departmentId,
      },
    });

    if (!department) {
      throw new AppError(
        "error.department.department_not_found",
        StatusCodes.BAD_REQUEST
      );
    }

    //TODO: Create Admin Configuration Table and feature

    const user = await prisma.user.create({
      data: {
        ...form,
        employeeId: await generateEmployeeId(),
      },
      include: {
        department: true,
        role: true,
      },
    });

    const tokenString = crypto.randomBytes(32).toString("hex");
    const tokenHash = await argon2.hash(tokenString);

    const token = await prisma.userToken.create({
        data: {
            userId: user.id,
            tokenHash,
            type: TokenType.PASSWORD_SETUP,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }
    })

    const tokenUrl = `${baseUrl}/auth/set-credentials/${tokenString}`;

    const templatePath = path.join(
      __dirname,
      "../../public/templates/account_creation.template.html"
    );

    let emailTemplate = readFileSync(templatePath, "utf-8");

    emailTemplate = emailTemplate
      .replace(/{{logoUrl}}/g, `${baseUrl}/assets/logo`)
      .replace(/{{employeeName}}/g, `${user.name} ${user.surname}`)
      .replace(/{{employeeId}}/g, user.employeeId)
      .replace(/{{employeeEmail}}/g, user.email)
      .replace(/{{department}}/g, user.department.name)
      .replace(/{{role}}/g, user.role.name)
      .replace(/{{setPasswordLink}}/g, tokenUrl)
      .replace(/{{supportEmail}}/g);
      .replace(/{{supportPhone}}/g);
      .replace(/{{websiteUrl}}/g);
      .replace(/{{privacyUrl}}/g);
      .replace(/{{termsUrl}}/g);
      .replace(/{{year}}/g, `${(new Date()).getFullYear()}`);


    return user;
  }
}
