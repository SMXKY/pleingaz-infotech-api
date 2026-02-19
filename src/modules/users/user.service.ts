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
import getUserPermissions from "./utilites/getUserPermissions.util";
import { id } from "zod/v4/locales";
import signToken from "./utilites/signToken.util";
import { UserStatus } from "@appTypes/user.types";

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

    await prisma.userToken.create({
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

    return {
      user: {
        ...safeUser,
        permissions,
        preferences,
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

    await prisma.userToken.create({
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

    return { message: "success.user.unterminate" };
  }
}
