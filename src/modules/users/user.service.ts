import { BaseService } from "src/base/BaseService";
import { UserRepository } from "./user.repository";
import {
  createUserSchema,
  updateUserSchema,
  CreateUserInput,
  UpdateUserInput,
  SetupAccountInput,
  setupAccountSchema,
  ResetPasswordInput,
  ChangePasswordInput,
  ChangeUserCredentialsInput,
  UpdateMeInput,
  UserDeactivateInput,
  UpdateUserPayrollDataInput,
} from "./user.schema";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import {
  FindManyOptions,
  PaginatedResult,
  ServiceContext,
} from "@appTypes/base.types";
import { $Enums, Status, TokenType, User } from "src/generated/prisma";
import { prisma } from "src";
import path from "path";
import { readFileSync } from "fs";
import generateEmployeeId from "./utilites/generateEmployeeId.util";
import crypto from "crypto";
import argon2 from "argon2";
import {
  ACCOUNT_LOGIN_WAIT_TIME_HOURS,
  baseUrl,
  EMAIL_VERIFICATION_EXPIRES_IN,
  frontEndUrl,
  MAX_LOGIN_ATTEMPTS,
  RESET_PASSWORD_LIMIT_HOURS,
} from "@utils/enviromentVariablesCheck.util";
import { sendEmail } from "@utils/sendEmail.util";
import { logUserActivity } from "@utils/logUserActivity.util";
import getUserPermissions, {
  permissionCache,
} from "./utilites/getUserPermissions.util";
import { id } from "zod/v4/locales";
import signToken from "./utilites/signToken.util";
import { Response, Request } from "express";
import { UpdateMeResult, UserStatus } from "@appTypes/user.types";
import { applyFtpUrlTransform } from "@utils/applyFtpUrl.util";
import { deleteFilesFromFTP, handleFileUploads } from "@services/ftp.service";
import { LogCategory, LogOperation } from "@appTypes/log.type";

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

  async findById(
    id: string,
    ctx: ServiceContext,
    include?: Record<string, boolean | object>
  ): Promise<User> {
    const record = await this.repository.findByIdOrThrow(id, {
      department: true,
      role: true,
    });
    return record;
  }

  async findMany(
    options: FindManyOptions,
    ctx: ServiceContext
  ): Promise<PaginatedResult<User>> {
    options.include = { department: true, role: true };
    return this.repository.findMany(options);
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
      return this.repository.softDelete(id, [
        "email",
        "username",
        "employeeId",
        "nationalIdNumber",
        "phoneNumber",
      ]);
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

    const validation = createUserSchema.safeParse(form);
    if (!validation.success) {
      const messages = validation.error.issues.map((i) => i.message).join(", ");
      throw new AppError(messages, StatusCodes.BAD_REQUEST);
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

      await tx.userPreference.create({
        data: {
          userId: user.id,
        },
      });

      const token = crypto.randomBytes(32).toString("hex");
      const tokenId = crypto.createHash("sha256").update(token).digest("hex");

      await tx.userToken.create({
        data: {
          id: tokenId,
          userId: user.id,
          type: TokenType.PASSWORD_SETUP,
          expiresAt: new Date(
            Date.now() + Number(EMAIL_VERIFICATION_EXPIRES_IN) * 60 * 60 * 1000
          ),
        },
      });

      const tokenUrl = `${frontEndUrl}/set-credentials?token=${token}`;

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

    this.log(ctx.req as Request, {
      operation: LogOperation.CREATE,
      category: LogCategory.WRITE,
      recordId: result.id,
      previousState: null,
      newState: result,
      changedFields: [],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return result;
  }

  async setupAccountCredentials(
    data: SetupAccountInput,
    ctx: ServiceContext
  ): Promise<{ message: string }> {
    const { token, username, password } = data;

    const tokenId = crypto.createHash("sha256").update(token).digest("hex");

    const userToken = await prisma.userToken.findUnique({
      where: { id: tokenId },
    });

    if (!userToken) {
      throw new AppError(
        "error.token.invalid_or_expired",
        StatusCodes.BAD_REQUEST
      );
    }

    if (userToken.usedAt) {
      throw new AppError("error.token.already_used", StatusCodes.BAD_REQUEST);
    }

    if (userToken.expiresAt < new Date()) {
      throw new AppError("error.token.expired", StatusCodes.BAD_REQUEST);
    }

    if (userToken.type !== TokenType.PASSWORD_SETUP) {
      throw new AppError(
        "error.token.invalid_or_expired",
        StatusCodes.BAD_REQUEST
      );
    }

    const usernameExists = await prisma.user.findUnique({
      where: { username },
    });

    if (usernameExists) {
      throw new AppError("error.db.duplicate", StatusCodes.CONFLICT, {
        fields: "username",
      });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userToken.userId },
        data: {
          username,
          password: await argon2.hash(password),
          passwordChangedAt: new Date(),
          status: "ACTIVE",
          isEmailVerified: true,
        },
      }),
      prisma.userToken.update({
        where: { id: tokenId },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: "success.account_setup_complete" };
  }

  async createSetupToken(
    userId: string,
    ctx: ServiceContext
  ): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("error.user.not_found", StatusCodes.NOT_FOUND);
    }

    if (user.status === "ACTIVE" && user.password) {
      throw new AppError("error.user.already_active", StatusCodes.BAD_REQUEST);
    }

    const existingToken = await prisma.userToken.findFirst({
      where: {
        userId,
        type: TokenType.PASSWORD_SETUP,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });

    if (existingToken) {
      throw new AppError(
        "error.token.valid_token_exists",
        StatusCodes.CONFLICT
      );
    }

    const config = await prisma.adminConfig.findFirst();
    if (!config) {
      throw new AppError(
        "error.config.not_found",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenId = crypto.createHash("sha256").update(token).digest("hex");

    const userToken = await prisma.userToken.create({
      data: {
        id: tokenId,
        userId,
        type: TokenType.PASSWORD_SETUP,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const tokenUrl = `${frontEndUrl}/set-credentials?token=${token}`;

    const templatePath = path.join(
      __dirname,
      "../../public/templates/account_creation.template.html"
    );

    const userWithRelations = await prisma.user.findUnique({
      where: { id: userId },
      include: { department: true, role: true },
    });

    const emailTemplate = readFileSync(templatePath, "utf-8")
      .replace(/{{logoUrl}}/g, config.logoUrl || `${baseUrl}/assets/logo.png`)
      .replace(/{{employeeName}}/g, `${user.name} ${user.surname}`)
      .replace(/{{employeeId}}/g, user.employeeId)
      .replace(/{{employeeEmail}}/g, user.email)
      .replace(/{{department}}/g, userWithRelations?.department?.name || "")
      .replace(/{{role}}/g, userWithRelations?.role?.name || "")
      .replace(/{{setPasswordLink}}/g, tokenUrl)
      .replace(/{{supportEmail}}/g, config.supportEmail)
      .replace(/{{supportPhone}}/g, config.companyPhoneNumber)
      .replace(/{{websiteUrl}}/g, frontEndUrl)
      .replace(/{{privacyUrl}}/g, `${frontEndUrl}/privacy`)
      .replace(/{{termsUrl}}/g, `${frontEndUrl}/terms`)
      .replace(/{{year}}/g, `${new Date().getFullYear()}`);

    await sendEmail(
      user.email,
      "INFOTECH S.A - Nouveau lien de configuration de compte",
      "",
      emailTemplate
    );

    this.log(ctx.req as Request, {
      operation: LogOperation.CREATE,
      category: LogCategory.WRITE,
      recordId: userToken.id,
      previousState: null,
      newState: {
        type: userToken.type,
        userId: userToken.userId,
      },
      changedFields: [],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return { message: "success.setup_token_sent" };
  }

  async login(
    credentials: { login: string; password: string },
    ctx: ServiceContext
  ): Promise<{ user: any; token: string }> {
    const { login, password } = credentials;

    if (!login || !password) {
      throw new AppError(
        "error.auth.invalid_credentials",
        StatusCodes.BAD_REQUEST
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: login }, { email: login }],
        deletedAt: null,
      },
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
        address: true,
        hireDate: true,
        createdAt: true,
        password: true,
        failedLoginAttempts: true,
        deactivatedUntil: true,
        lockedUntil: true,
        profilePictureUrl: true,
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
      throw new AppError(
        "error.auth.incorrect_credentials",
        StatusCodes.UNAUTHORIZED
      );
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (60 * 1000)
      );
      throw new AppError("error.auth.account_locked", StatusCodes.FORBIDDEN, {
        minutes: remainingMinutes,
      });
    }

    if (!user.password) {
      throw new AppError(
        "error.auth.incorrect_credentials",
        StatusCodes.UNAUTHORIZED
      );
    }

    if (user.status !== "ACTIVE") {
      throw new AppError(
        "error.auth.account_not_active",
        StatusCodes.FORBIDDEN
      );
    }

    if (user.deactivatedUntil && user.deactivatedUntil.getTime() > Date.now()) {
      throw new AppError(
        "error.auth.account_temporarily_not_active",
        StatusCodes.FORBIDDEN
      );
    }

    const isPasswordCorrect = await argon2.verify(user.password, password);

    if (!isPasswordCorrect) {
      const newAttempts = user.failedLoginAttempts + 1;
      const shouldLock = newAttempts >= Number(MAX_LOGIN_ATTEMPTS);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          ...(shouldLock && {
            lockedUntil: new Date(
              Date.now() +
                Number(ACCOUNT_LOGIN_WAIT_TIME_HOURS) * 60 * 60 * 1000
            ),
          }),
        },
      });

      if (shouldLock) {
        throw new AppError("error.auth.account_locked", StatusCodes.FORBIDDEN, {
          minutes: Number(ACCOUNT_LOGIN_WAIT_TIME_HOURS) * 60,
        });
      }

      throw new AppError(
        "error.auth.incorrect_credentials",
        StatusCodes.UNAUTHORIZED
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoggedInAt: new Date(),
      },
    });

    const [permissions, preferences] = await Promise.all([
      getUserPermissions(user.id),
      prisma.userPreference.findUnique({
        where: { userId: user.id },
      }),
    ]);

    const {
      password: _password,
      failedLoginAttempts: _attempts,
      lockedUntil: _locked,
      deactivatedUntil: _deactivaed,
      ...safeUser
    } = user;

    this.log(ctx.req as Request, {
      operation: LogOperation.AUTH,
      category: LogCategory.WRITE,
      recordId: safeUser.id,
      previousState: null,
      newState: null,
      changedFields: [],
      userId: ctx.userId,
      userEmail: user.email || "system",
    });

    return {
      user: {
        ...safeUser,
        permissions,
        preferences,
        profilePictureUrl: user.profilePictureUrl
          ? applyFtpUrlTransform(user.profilePictureUrl)
          : "",
      },
      token: signToken(user.id),
    };
  }

  async forgotPassword(
    email: string,
    ctx: ServiceContext
  ): Promise<{ message: string }> {
    const GENERIC_RESPONSE = { message: "success.reset_token_sent" };

    const user = await prisma.user.findUnique({
      where: { email: email.trim() },
      include: { department: true, role: true, preference: true },
    });

    if (!user) {
      return GENERIC_RESPONSE;
    }

    if (user.status !== "ACTIVE" || !user.password) {
      return GENERIC_RESPONSE;
    }

    await prisma.userToken.updateMany({
      where: {
        userId: user.id,
        type: TokenType.PASSWORD_RESET,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    const config = await prisma.adminConfig.findFirst();
    if (!config) {
      throw new AppError(
        "error.config.not_found",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expiresAt = new Date(
      Date.now() + Number(RESET_PASSWORD_LIMIT_HOURS) * 60 * 60 * 1000
    );

    const userToken = await prisma.userToken.create({
      data: {
        id: hashedToken,
        userId: user.id,
        type: TokenType.PASSWORD_RESET,
        expiresAt,
      },
    });

    const resetPasswordLink = `${frontEndUrl}/reset-password?token=${rawToken}`;

    const requestDate = new Date().toLocaleString("fr-FR", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Africa/Douala",
    });

    const language = user.preference?.language.toLocaleLowerCase() ?? "fr";
    const templateFile = `password-reset.${language}.template.html`;

    const templatePath = path.join(
      __dirname,
      "../../public/templates",
      templateFile
    );

    const emailHtml = readFileSync(templatePath, "utf-8")
      .replace(/{{logoUrl}}/g, config.logoUrl || `${baseUrl}/assets/logo.png`)
      .replace(/{{employeeName}}/g, `${user.name} ${user.surname}`)
      .replace(/{{employeeId}}/g, user.employeeId)
      .replace(/{{employeeEmail}}/g, user.email)
      .replace(/{{requestDate}}/g, requestDate)
      .replace(/{{resetPasswordLink}}/g, resetPasswordLink)
      .replace(/{{expiryHours}}/g, String(RESET_PASSWORD_LIMIT_HOURS))
      .replace(/{{supportEmail}}/g, config.supportEmail)
      .replace(/{{supportPhone}}/g, config.companyPhoneNumber)
      .replace(/{{websiteUrl}}/g, frontEndUrl)
      .replace(/{{privacyUrl}}/g, `${frontEndUrl}/privacy`)
      .replace(/{{termsUrl}}/g, `${frontEndUrl}/terms`)
      .replace(/{{year}}/g, String(new Date().getFullYear()));

    await sendEmail(
      user.email,
      "INFOTECH S.A — Réinitialisation de votre mot de passe",
      "",
      emailHtml
    );

    this.log(ctx.req as Request, {
      operation: LogOperation.FORGOT_PASSWORD,
      category: LogCategory.WRITE,
      recordId: userToken.id,
      previousState: null,
      newState: {
        userId: userToken.userId,
        type: userToken.type,
      },
      changedFields: [],
      userId: ctx.userId,
      userEmail: user.email || "system",
    });

    return GENERIC_RESPONSE;
  }

  async resetPassword(
    data: ResetPasswordInput,
    ctx: ServiceContext
  ): Promise<{ message: string }> {
    const { password, token } = data;

    const tokenId = crypto.createHash("sha256").update(token).digest("hex");

    const userToken = await prisma.userToken.findUnique({
      where: { id: tokenId },
    });

    if (!userToken) {
      throw new AppError(
        "error.token.invalid_or_expired",
        StatusCodes.BAD_REQUEST
      );
    }

    if (userToken.usedAt) {
      throw new AppError("error.token.already_used", StatusCodes.BAD_REQUEST);
    }

    if (userToken.expiresAt < new Date()) {
      throw new AppError("error.token.expired", StatusCodes.BAD_REQUEST);
    }

    if (userToken.type !== TokenType.PASSWORD_RESET) {
      throw new AppError(
        "error.token.invalid_or_expired",
        StatusCodes.BAD_REQUEST
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userToken.userId },
        data: {
          password: await argon2.hash(password),
          passwordChangedAt: new Date(),
        },
      }),
      prisma.userToken.update({
        where: { id: tokenId },
        data: { usedAt: new Date() },
      }),
    ]);

    this.log(ctx.req as Request, {
      operation: LogOperation.RESET_PASSWORD,
      category: LogCategory.WRITE,
      recordId: userToken.id,
      previousState: {
        usedAt: userToken.usedAt,
      },
      newState: {
        usedAt: new Date(),
      },
      changedFields: ["usedAt"],
      userId: userToken.userId,
      userEmail: ctx.userEmail || "system",
    });

    return { message: "success.password.reset" };
  }

  async terminateUser(
    userId: string,
    ctx: ServiceContext
  ): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new AppError("error.user.not_found", StatusCodes.NOT_FOUND);
    }

    if (user.status === UserStatus.TERMINATED) {
      throw new AppError(
        "error.user.account_already_terminated",
        StatusCodes.BAD_REQUEST
      );
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        status: UserStatus.TERMINATED,
      },
    });

    this.log(ctx.req as Request, {
      operation: LogOperation.UPDATE,
      category: LogCategory.WRITE,
      recordId: userId,
      previousState: {
        status: user.status,
      },
      newState: {
        status: UserStatus.TERMINATED,
      },
      changedFields: ["status"],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return { message: "success.user.terminate" };
  }

  async activateAccount(
    userId: string,
    ctx: ServiceContext
  ): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new AppError("error.user.not_found", StatusCodes.NOT_FOUND);
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new AppError(
        "error.user.account_already_active",
        StatusCodes.BAD_REQUEST
      );
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        status: UserStatus.ACTIVE,
      },
    });

    this.log(ctx.req as Request, {
      operation: LogOperation.UPDATE,
      category: LogCategory.WRITE,
      recordId: userId,
      previousState: {
        status: user.status,
      },
      newState: {
        status: UserStatus.ACTIVE,
      },
      changedFields: ["status"],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return { message: "success.user.unterminate" };
  }

  async chageRole(
    data: { roleId: string; userId: string },
    ctx: ServiceContext
  ): Promise<{ message: string }> {
    const { userId, roleId } = data;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new AppError("error.user.not_found", StatusCodes.NOT_FOUND);
    }

    if (user.roleId === roleId) {
      throw new AppError(
        "error.user.role_already_assigned",
        StatusCodes.BAD_REQUEST
      );
    }

    if (user.status === UserStatus.TERMINATED) {
      throw new AppError(
        "error.user.account_terminated",
        StatusCodes.BAD_REQUEST
      );
    }

    if (user.isSystem) {
      throw new AppError(
        "error.user.system_user_immutable",
        StatusCodes.FORBIDDEN
      );
    }

    const role = await prisma.role.findUnique({
      where: {
        id: roleId,
      },
    });

    if (!role) {
      throw new AppError("error.role.not_found", StatusCodes.NOT_FOUND);
    }

    const previousRoleId = user.roleId;

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        roleId: roleId,
      },
    });

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
      changedFields: ["roleId"],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return { message: "success.user.role_change" };
  }

  async changePassword(
    credentials: ChangePasswordInput,
    ctx: ServiceContext,
    res: Response
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword, confirmPassword } = credentials;
    const user = res.locals.user;

    const userWithPassword = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        password: true,
      },
    });

    if (!userWithPassword) {
      throw new AppError(
        "error.auth.user_no_longer_exist",
        StatusCodes.NOT_FOUND
      );
    }

    if (!userWithPassword.password) {
      throw new AppError(
        "error.auth.account_not_active",
        StatusCodes.NOT_FOUND
      );
    }

    const isPasswordCorrect = await argon2.verify(
      userWithPassword.password,
      currentPassword
    );

    if (!isPasswordCorrect) {
      throw new AppError(
        "error.auth.incorrect_password",
        StatusCodes.UNAUTHORIZED
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          password: await argon2.hash(newPassword),
          passwordChangedAt: new Date(),
        },
      }),
    ]);

    this.log(ctx.req as Request, {
      operation: LogOperation.CHANGE_PASSWORD,
      category: LogCategory.WRITE,
      recordId: res.locals.id,
      previousState: null,
      newState: null,
      changedFields: ["password"],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return { message: "success.user.changed_password" };
  }

  async changeUserCredentials(
    data: ChangeUserCredentialsInput,
    ctx: ServiceContext
  ): Promise<{ message: string }> {
    const { username, password, email, userId } = data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError("error.user.not_found", StatusCodes.NOT_FOUND);
    }

    if (user.status === UserStatus.TERMINATED) {
      throw new AppError(
        "error.user.account_terminated",
        StatusCodes.BAD_REQUEST
      );
    }

    const usernameExists = await prisma.user.findUnique({
      where: { username },
    });

    if (usernameExists) {
      throw new AppError("error.db.duplicate", StatusCodes.CONFLICT, {
        fields: "username",
      });
    }

    const userExist = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (userExist) {
      throw new AppError("error.user.already_exists", StatusCodes.CONFLICT);
    }

    const [newUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          username,
          email,
          password: await argon2.hash(password),
          passwordChangedAt: new Date(),
        },
      }),
    ]);

    this.log(ctx.req as Request, {
      operation: LogOperation.CHANGE_USER_CREDENTIALS,
      category: LogCategory.WRITE,
      recordId: user.id,
      previousState: {
        email: user.email,
        username: user.username,
      },
      newState: {
        email: newUser.email,
        username: newUser.username,
      },
      changedFields: ["password", "email", "username"],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return { message: "success.user.credentials_changed" };
  }

  async updateMe(
    data: UpdateMeInput,
    ctx: ServiceContext,
    res: Response
  ): Promise<Partial<UpdateMeResult>> {
    const userId = res.locals.user.id as string;
    const { preferences, ...userFields } = data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError("error.user.not_found", StatusCodes.NOT_FOUND);
    }

    if (user.status === UserStatus.TERMINATED) {
      throw new AppError(
        "error.user.account_terminated",
        StatusCodes.BAD_REQUEST
      );
    }

    const [updatedUser, updatedPreferences] = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.update({
          where: { id: userId },
          data: userFields,
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
            username: true,
            employeeId: true,
            phoneNumber: true,
            address: true,
            gender: true,
            dob: true,
            status: true,
            isEmailVerified: true,
            roleId: true,
            departmentId: true,
            emergencyContactName: true,
            emergencyContactPhoneNumber: true,
            passwordChangedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        const prefs = await tx.userPreference.upsert({
          where: { userId },
          create: {
            userId,
            language: preferences?.language,
            currency: preferences?.currency,
          },
          update: {
            ...(preferences?.language !== undefined && {
              language: preferences.language,
            }),
            ...(preferences?.currency !== undefined && {
              currency: preferences.currency,
            }),
          },
          select: {
            language: true,
            currency: true,
          },
        });

        return [user, prefs] as const;
      }
    );

    permissionCache.delete(userId);

    this.log(ctx.req as Request, {
      operation: LogOperation.UPDATE,
      category: LogCategory.WRITE,
      recordId: user.id,
      previousState: {
        ...data,
      },
      newState: {
        ...updatedUser,
        prferences: updatedPreferences,
      },
      changedFields: [""],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return {
      ...updatedUser,
      preferences: updatedPreferences,
    };
  }

  async updateMyProfilePicture(
    ctx: ServiceContext,
    res: Response,
    req: Request
  ): Promise<{ url: string }> {
    const userId = res.locals.user.id as string;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError("error.user.not_found", StatusCodes.NOT_FOUND);
    }

    if (user.status === UserStatus.TERMINATED) {
      throw new AppError(
        "error.user.account_terminated",
        StatusCodes.BAD_REQUEST
      );
    }

    const fileUrls = await handleFileUploads(req, 20, [
      ".png",
      ".jpg",
      ".jpeg",
    ]);

    if (!fileUrls || fileUrls.length === 0) {
      throw new AppError(
        "error.user.profile_picture_required",
        StatusCodes.BAD_REQUEST
      );
    }

    const oldPP = user.profilePictureUrl;
    let updatedUser;

    try {
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { profilePictureUrl: fileUrls[0] },
      });
    } catch (err) {
      await deleteFilesFromFTP([fileUrls[0]]).catch(() => {});
      throw err;
    }

    if (oldPP) {
      await deleteFilesFromFTP([oldPP]).catch(() => {});
    }

    this.log(ctx.req as Request, {
      operation: LogOperation.UPDATE,
      category: LogCategory.WRITE,
      recordId: user.id,
      previousState: {
        profilePictureUrl: oldPP,
      },
      newState: {
        profilePictureUrl: updatedUser.profilePictureUrl,
      },
      changedFields: ["profilePictureUrl"],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return { url: applyFtpUrlTransform(fileUrls[0]) };
  }

  async temporarilyDeactivateAccount(
    data: UserDeactivateInput,
    ctx: ServiceContext
  ): Promise<{ message: string }> {
    const { userId, date } = data;

    if (new Date(date) <= new Date()) {
      throw new AppError(
        "error.user.deactivation_date_must_be_future",
        StatusCodes.BAD_REQUEST
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        deactivatedUntil: true,
        status: true,
        isSystem: true,
      },
    });

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
      throw new AppError(
        "error.user.account_already_terminated",
        StatusCodes.CONFLICT
      );
    }

    if (user.deactivatedUntil && user.deactivatedUntil > new Date()) {
      throw new AppError(
        "error.user.account_already_deactivated",
        StatusCodes.CONFLICT
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        deactivatedUntil: new Date(date),
      },
    });

    permissionCache.delete(userId);

    this.log(ctx.req as Request, {
      operation: LogOperation.UPDATE,
      category: LogCategory.WRITE,
      recordId: user.id,
      previousState: {
        deactivatedUntil: user.deactivatedUntil,
      },
      newState: {
        deactivatedUntil: updatedUser.deactivatedUntil,
      },
      changedFields: ["deactivatedUntil"],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return { message: "success.user.deactivated" };
  }

  async reactivateAccount(
    userId: string,
    ctx: ServiceContext
  ): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        deactivatedUntil: true,
        status: true,
        isSystem: true,
      },
    });

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
      throw new AppError(
        "error.user.account_already_terminated",
        StatusCodes.CONFLICT
      );
    }

    if (!user.deactivatedUntil || user.deactivatedUntil <= new Date()) {
      throw new AppError(
        "error.user.account_not_deactivated",
        StatusCodes.CONFLICT
      );
    }

    const previousState = {
      status: user.status,
      deactivatedUntil: user.deactivatedUntil,
    };

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        deactivatedUntil: null,
      },
    });

    permissionCache.delete(userId);

    this.log(ctx.req as Request, {
      operation: LogOperation.UPDATE,
      category: LogCategory.WRITE,
      recordId: user.id,
      previousState: {
        deactivatedUntil: user.deactivatedUntil,
      },
      newState: {
        deactivatedUntil: updatedUser.deactivatedUntil,
      },
      changedFields: ["deactivatedUntil"],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return { message: "success.user.reactivated" };
  }

  async getMyPayrollData(
    ctx: ServiceContext
  ): Promise<Partial<UpdateMeResult>> {
    const userId = ctx.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        baseSalaryInCFA: true,
        bankName: true,
        cnpsNumber: true,
        taxId: true,
        status: true,
        id: true,
      },
    });

    if (!user) {
      throw new AppError("error.user.not_found", StatusCodes.NOT_FOUND);
    }

    if (user.status === Status.TERMINATED) {
      throw new AppError(
        "error.user.account_terminated",
        StatusCodes.FORBIDDEN
      );
    }

    this.log(ctx.req as Request, {
      operation: LogOperation.READ,
      category: LogCategory.SENSITIVE_READ,
      recordId: user.id,
      previousState: null,
      newState: null,
      changedFields: [],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    const { status, id, ...safeUser } = user;
    return safeUser;
  }

  async getUserPayrollData(
    userId: string,
    ctx: ServiceContext
  ): Promise<Partial<UpdateMeResult>> {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        baseSalaryInCFA: true,
        bankName: true,
        cnpsNumber: true,
        taxId: true,
        status: true,
        id: true,
      },
    });

    if (!user) {
      throw new AppError("error.user.not_found", StatusCodes.NOT_FOUND);
    }

    if (user.status === Status.TERMINATED) {
      throw new AppError(
        "error.user.account_terminated",
        StatusCodes.FORBIDDEN
      );
    }

    this.log(ctx.req as Request, {
      operation: LogOperation.READ,
      category: LogCategory.SENSITIVE_READ,
      recordId: user.id,
      previousState: null,
      newState: null,
      changedFields: [],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    const { status, id, ...safeUser } = user;
    return safeUser;
  }

  async getAllUserPayrollData(
    options: FindManyOptions,
    ctx: ServiceContext
  ): Promise<{ users: Partial<User>[]; meta: any }> {
    options.select = {
      baseSalaryInCFA: true,
      bankName: true,
      cnpsNumber: true,
      taxId: true,
      id: true,
      email: true,
      username: true,
      name: true,
      surname: true,
      employeeId: true,
      phoneNumber: true,
      gender: true,
      address: true,
      hireDate: true,
    };

    const result = await this.repository.findMany(options);

    this.log(ctx.req as Request, {
      operation: LogOperation.READ,
      category: LogCategory.SENSITIVE_READ,
      recordId: "bulk_payroll_read",
      previousState: null,
      newState: null,
      changedFields: [],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return {
      users: result.data,
      meta: result.meta,
    };
  }

  async updateUserPayrollData(
    data: UpdateUserPayrollDataInput,
    ctx: ServiceContext
  ): Promise<Partial<User>> {
    const {
      userId,
      baseSalaryInCFA,
      bankName,
      cnpsNumber,
      taxId,
      login,
      password,
    } = data;

    const authUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: login }, { email: login }],
        deletedAt: null,
      },
      select: {
        id: true,
        password: true,
        status: true,
        failedLoginAttempts: true,
        deactivatedUntil: true,
        lockedUntil: true,
      },
    });

    if (!authUser || !authUser.password) {
      throw new AppError(
        "error.auth.incorrect_credentials",
        StatusCodes.UNAUTHORIZED
      );
    }

    if (authUser.status !== Status.ACTIVE) {
      throw new AppError(
        "error.auth.account_not_active",
        StatusCodes.FORBIDDEN
      );
    }

    if (authUser.lockedUntil && authUser.lockedUntil.getTime() > Date.now()) {
      const remainingMinutes = Math.ceil(
        (authUser.lockedUntil.getTime() - Date.now()) / (60 * 1000)
      );
      throw new AppError("error.auth.account_locked", StatusCodes.FORBIDDEN, {
        minutes: remainingMinutes,
      });
    }

    if (
      authUser.deactivatedUntil &&
      authUser.deactivatedUntil.getTime() > Date.now()
    ) {
      throw new AppError(
        "error.auth.account_temporarily_not_active",
        StatusCodes.FORBIDDEN
      );
    }

    const isPasswordCorrect = await argon2.verify(authUser.password, password);

    if (!isPasswordCorrect) {
      const newAttempts = authUser.failedLoginAttempts + 1;
      const shouldLock = newAttempts >= Number(MAX_LOGIN_ATTEMPTS);

      await prisma.user.update({
        where: { id: authUser.id },
        data: {
          failedLoginAttempts: newAttempts,
          ...(shouldLock && {
            lockedUntil: new Date(
              Date.now() +
                Number(ACCOUNT_LOGIN_WAIT_TIME_HOURS) * 60 * 60 * 1000
            ),
          }),
        },
      });

      throw new AppError(
        shouldLock
          ? "error.auth.account_locked"
          : "error.auth.incorrect_credentials",
        shouldLock ? StatusCodes.FORBIDDEN : StatusCodes.UNAUTHORIZED,
        shouldLock
          ? { minutes: Number(ACCOUNT_LOGIN_WAIT_TIME_HOURS) * 60 }
          : undefined
      );
    }

    await prisma.user.update({
      where: { id: authUser.id },
      data: { failedLoginAttempts: 0 },
    });

    const targetUser = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        baseSalaryInCFA: true,
        bankName: true,
        cnpsNumber: true,
        taxId: true,
        status: true,
        id: true,
      },
    });

    if (!targetUser) {
      throw new AppError("error.user.not_found", StatusCodes.NOT_FOUND);
    }

    if (targetUser.status === Status.TERMINATED) {
      throw new AppError(
        "error.user.account_terminated",
        StatusCodes.FORBIDDEN
      );
    }

    const previousState = {
      baseSalaryInCFA: targetUser.baseSalaryInCFA,
      bankName: targetUser.bankName,
      cnpsNumber: targetUser.cnpsNumber,
      taxId: targetUser.taxId,
    };

    const updatePayload = {
      ...(baseSalaryInCFA !== undefined && { baseSalaryInCFA }),
      ...(bankName !== undefined && { bankName }),
      ...(cnpsNumber !== undefined && { cnpsNumber }),
      ...(taxId !== undefined && { taxId }),
    };

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updatePayload,
      select: {
        baseSalaryInCFA: true,
        bankName: true,
        cnpsNumber: true,
        taxId: true,
      },
    });

    this.log(ctx.req as Request, {
      operation: LogOperation.UPDATE,
      category: LogCategory.WRITE,
      recordId: userId,
      previousState,
      newState: updatedUser,
      changedFields: Object.keys(updatePayload),
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return updatedUser;
  }

  async changeUserDepartment(
    data: { departmentId: string; userId: string },
    ctx: ServiceContext
  ): Promise<{ message: string }> {
    const { userId, departmentId } = data;

    const [user, department] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.department.findUnique({ where: { id: departmentId } }),
    ]);

    if (!user) {
      throw new AppError("error.user.not_found", StatusCodes.NOT_FOUND);
    }

    if (!department) {
      throw new AppError("error.department.not_found", StatusCodes.NOT_FOUND);
    }

    if (user.status === UserStatus.TERMINATED) {
      throw new AppError(
        "error.user.account_terminated",
        StatusCodes.BAD_REQUEST
      );
    }

    if (user.departmentId === departmentId) {
      throw new AppError(
        "error.user.department_already_assigned",
        StatusCodes.BAD_REQUEST
      );
    }

    if (user.isSystem) {
      throw new AppError(
        "error.user.system_user_immutable",
        StatusCodes.FORBIDDEN
      );
    }

    const previousDepartmentId = user.departmentId;

    await prisma.user.update({
      where: { id: userId },
      data: { departmentId },
    });

    this.log(ctx.req as Request, {
      operation: LogOperation.UPDATE,
      category: LogCategory.WRITE,
      recordId: userId,
      previousState: { departmentId: previousDepartmentId },
      newState: { departmentId },
      changedFields: ["departmentId"],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    return { message: "success.user.department_change" };
  }

  async revokeUserRole(
    data: { userId: string; suspensionReason: string },
    ctx: ServiceContext
  ): Promise<{ message: string }> {
    const { userId, suspensionReason } = data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        preference: true,
      },
    });

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
      throw new AppError(
        "error.user.account_terminated",
        StatusCodes.BAD_REQUEST
      );
    }

    if (user.status === Status.SUSPENDED) {
      throw new AppError(
        "error.user.already_suspended",
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !suspensionReason ||
      typeof suspensionReason !== "string" ||
      suspensionReason.trim().length < 10 ||
      suspensionReason.trim().length > 255
    ) {
      throw new AppError(
        "error.user.suspension_reason_invalid_length",
        StatusCodes.BAD_REQUEST
      );
    }

    const previousState = {
      status: user.status,
      suspensionReason: user.suspensionReason,
    };

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          status: Status.SUSPENDED,
          suspensionReason,
        },
      }),
      prisma.permissionOverride.updateMany({
        where: { userId, deletedAt: null },
        data: { deletedAt: new Date() },
      }),
    ]);

    permissionCache.delete(userId);

    this.log(ctx.req as Request, {
      operation: LogOperation.UPDATE,
      category: LogCategory.WRITE,
      recordId: user.employeeId,
      previousState,
      newState: {
        status: Status.SUSPENDED,
        suspensionReason,
      },
      changedFields: ["status", "permissionOverrides", "suspensionReason"],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    const config = await prisma.adminConfig.findFirst();
    if (!config) {
      throw new AppError(
        "error.config.not_found",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const language = user.preference?.language.toLocaleLowerCase() ?? "fr";
    const templateFile = `account_suspension.template.${language}.html`;

    const templatePath = path.join(
      __dirname,
      "../../public/templates",
      templateFile
    );

    const emailHtml = readFileSync(templatePath, "utf-8")
      .replace(/{{logoUrl}}/g, config.logoUrl || `${baseUrl}/assets/logo.png`)
      .replace(/{{employeeName}}/g, `${user.name} ${user.surname}`)
      .replace(/{{employeeId}}/g, user.employeeId)
      .replace(/{{employeeEmail}}/g, user.email)
      .replace(
        /{{suspendedAt}}/g,
        new Date().toLocaleDateString(language, { dateStyle: "long" })
      )
      .replace(/{{supportEmail}}/g, config.supportEmail)
      .replace(/{{supportPhone}}/g, config.companyPhoneNumber)
      .replace(/{{websiteUrl}}/g, frontEndUrl)
      .replace(/{{privacyUrl}}/g, `${frontEndUrl}/privacy`)
      .replace(/{{termsUrl}}/g, `${frontEndUrl}/terms`)
      .replace(/{{year}}/g, String(new Date().getFullYear()));

    const subject =
      user.preference?.language?.toLowerCase() === "fr"
        ? "Notification de suspension de compte - INFOTECH S.A"
        : "Account Suspension Notice - INFOTECH S.A";

    await sendEmail(user.email, subject, "", emailHtml);

    return { message: "success.user.role_revoked" };
  }

  async reinstateUser(
    data: { userId: string },
    ctx: ServiceContext
  ): Promise<{ message: string }> {
    const { userId } = data;

    const [user] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { preference: true, role: true },
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
      throw new AppError(
        "error.user.account_terminated",
        StatusCodes.BAD_REQUEST
      );
    }

    if (user.status !== Status.SUSPENDED) {
      throw new AppError("error.user.not_suspended", StatusCodes.BAD_REQUEST);
    }

    const previousState = {
      status: user.status,
      suspensionReason: user.suspensionReason,
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
        suspensionReason: null,
      },
    });

    permissionCache.delete(userId);
    this.log(ctx.req as Request, {
      operation: LogOperation.UPDATE,
      category: LogCategory.WRITE,
      recordId: user.employeeId,
      previousState,
      newState: {
        status: UserStatus.ACTIVE,
        suspensionReason: null,
      },
      changedFields: ["status", "suspensionReason"],
      userId: ctx.userId,
      userEmail: ctx.userEmail || "system",
    });

    const config = await prisma.adminConfig.findFirst();
    if (!config) {
      throw new AppError(
        "error.config.not_found",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const language = user.preference?.language.toLocaleLowerCase() ?? "fr";
    const templateFile = `account_reinstated.template.${language}.html`;

    const templatePath = path.join(
      __dirname,
      "../../public/templates",
      templateFile
    );

    const emailHtml = readFileSync(templatePath, "utf-8")
      .replace(/{{logoUrl}}/g, config.logoUrl || `${baseUrl}/assets/logo.png`)
      .replace(/{{employeeName}}/g, `${user.name} ${user.surname}`)
      .replace(/{{employeeId}}/g, user.employeeId)
      .replace(/{{employeeEmail}}/g, user.email)
      .replace(
        /{{reinstatedAt}}/g,
        new Date().toLocaleDateString(language, { dateStyle: "long" })
      )
      .replace(/{{role}}/g, user.role.name)
      .replace(/{{loginUrl}}/g, frontEndUrl)
      .replace(/{{supportEmail}}/g, config.supportEmail)
      .replace(/{{supportPhone}}/g, config.companyPhoneNumber)
      .replace(/{{websiteUrl}}/g, frontEndUrl)
      .replace(/{{privacyUrl}}/g, `${frontEndUrl}/privacy`)
      .replace(/{{termsUrl}}/g, `${frontEndUrl}/terms`)
      .replace(/{{year}}/g, String(new Date().getFullYear()));

    const subject =
      user.preference?.language?.toLowerCase() === "fr"
        ? "Rétablissement du compte - INFOTECH S.A"
        : "Account Reinstatement - INFOTECH S.A";

    await sendEmail(user.email, subject, "", emailHtml);

    return { message: "success.user.reinstated" };
  }
}
