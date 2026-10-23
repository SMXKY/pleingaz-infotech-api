import { ApprovalRepository } from "./approval.repository";
import { approveOrRejectSchema, ApproveOrRejectInput } from "./approval.schema";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import {
  FindManyOptions,
  PaginatedResult,
  ServiceContext,
} from "@appTypes/base.types";
import {
  ApprovalEntityType,
  ApprovalStatus,
  ApprovalRole,
  OrderStatus,
  NotificationType,
  NotificationPriority,
  Approval,
} from "src/generated/prisma";
import prisma from "@models/index.model";
import { logUserActivity } from "@utils/logUserActivity.util";
import { LogCategory, LogOperation } from "@appTypes/log.type";
import { sendAndDispatch } from "@services/notification/notification.dispatcher";
import { BaseService } from "src/base/BaseService";
import { recalculateSupplierMetrics } from "@utils/recalculateSupplierMetrics.util";

const ROLE_NAME_TO_APPROVAL_ROLE: Record<string, ApprovalRole> = {
  "Directeur Général (CEO)": ApprovalRole.CEO,
  "Comptable (Accountant)": ApprovalRole.ACCOUNTING,
  "Chef d'Exploitation (Chief of Exploitation)":
    ApprovalRole.CHIEF_EXPLOITATION,
  "Responsable de Département (Department Head)": ApprovalRole.DEPARTMENT_HEAD,
  "Directeur Général Adjoint (General Manager)": ApprovalRole.GENERAL_MANAGER,
};

const APPROVAL_ROLE_TO_NAME: Record<ApprovalRole, string> = {
  [ApprovalRole.CEO]: "Directeur Général (CEO)",
  [ApprovalRole.ACCOUNTING]: "Comptable (Accountant)",
  [ApprovalRole.CHIEF_EXPLOITATION]:
    "Chef d'Exploitation (Chief of Exploitation)",
  [ApprovalRole.DEPARTMENT_HEAD]:
    "Responsable de Département (Department Head)",
  [ApprovalRole.GENERAL_MANAGER]: "Directeur Général Adjoint (General Manager)",
};

export class ApprovalService extends BaseService<
  Approval,
  ApproveOrRejectInput
> {
  protected repository: ApprovalRepository;
  protected tableName = "approvals";

  constructor() {
    super();
    this.repository = new ApprovalRepository();
  }

  private async getUserApprovalRoles(userId: string): Promise<ApprovalRole[]> {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { role: true },
    });

    if (!user || !user.role) return [];

    const approvalRole = ROLE_NAME_TO_APPROVAL_ROLE[user.role.name];
    return approvalRole ? [approvalRole] : [];
  }

  async getMyApprovals(
    ctx: ServiceContext,
    options: FindManyOptions
  ): Promise<PaginatedResult<Approval>> {
    const approvalRoles = await this.getUserApprovalRoles(ctx.userId!);

    return this.repository.findByInvolvement(
      ctx.userId!,
      approvalRoles,
      options
    );
  }

  async getApprovalById(id: string, ctx: ServiceContext): Promise<any> {
    const approvalRoles = await this.getUserApprovalRoles(ctx.userId!);
    const isInvolved = await this.repository.isUserInvolved(
      id,
      ctx.userId!,
      approvalRoles
    );

    if (!isInvolved) {
      throw new AppError("error.approval.not_found", StatusCodes.NOT_FOUND);
    }

    const approval = await this.repository.findById(id);
    if (!approval) {
      throw new AppError("error.approval.not_found", StatusCodes.NOT_FOUND);
    }

    return approval;
  }

  async getApprovalByRecord(
    recordId: string,
    entityType: string,
    ctx: ServiceContext
  ): Promise<any> {
    const approval = await this.repository.findByRecord(recordId, entityType);

    if (!approval) {
      throw new AppError("error.approval.not_found", StatusCodes.NOT_FOUND);
    }

    const approvalRoles = await this.getUserApprovalRoles(ctx.userId!);
    const isInvolved = await this.repository.isUserInvolved(
      approval.id,
      ctx.userId!,
      approvalRoles
    );

    if (!isInvolved) {
      throw new AppError("error.approval.not_found", StatusCodes.NOT_FOUND);
    }

    return approval;
  }

  async approveOrReject(
    approvalId: string,
    data: ApproveOrRejectInput,
    ctx: ServiceContext
  ): Promise<any> {
    const result = approveOrRejectSchema.safeParse(data);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message)[0];
      throw new AppError(messages, StatusCodes.BAD_REQUEST);
    }
    const { action, notes } = result.data;

    const approval = await prisma.approval.findFirst({
      where: {
        id: approvalId,
      },
      include: {
        steps: { orderBy: { step: "asc" } },
      },
    });

    if (!approval) {
      throw new AppError("error.approval.not_found", StatusCodes.NOT_FOUND);
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new AppError("error.approval.not_pending", StatusCodes.BAD_REQUEST);
    }

    const entityConfig = this.getEntityConfig(approval.entityType);

    if (!entityConfig) {
      throw new AppError(
        "error.approval.unsupported_entity_type",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const orderExists = await (prisma as any)[
      entityConfig.modelName
    ].findUnique({
      where: { id: approval.recordId },
      select: { id: true },
    });

    if (!orderExists) {
      throw new AppError(
        "error.approval.order_not_found",
        StatusCodes.NOT_FOUND
      );
    }

    const currentStep = approval.steps.find(
      (s) => s.step === approval.currentStep
    );
    if (!currentStep) {
      throw new AppError(
        "error.approval.step_not_found",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const user = await prisma.user.findFirst({
      where: { id: ctx.userId!, deletedAt: null },
      include: { role: true },
    });

    if (!user || !user.role) {
      throw new AppError(
        "error.approval.not_authorized",
        StatusCodes.FORBIDDEN
      );
    }

    const requiredRoleName = APPROVAL_ROLE_TO_NAME[currentStep.role];
    if (!requiredRoleName || user.role.name !== requiredRoleName) {
      throw new AppError(
        "error.approval.not_authorized",
        StatusCodes.FORBIDDEN
      );
    }

    const updatedApproval = await prisma.$transaction(async (tx) => {
      await tx.approvalStep.update({
        where: {
          approvalId_step: {
            approvalId: approval.id,
            step: currentStep.step,
          },
        },
        data: {
          status: action as ApprovalStatus,
          decidedById: ctx.userId!,
          decidedAt: new Date(),
          notes: notes || null,
        },
      });

      if (action === "REJECTED") {
        await tx.approval.update({
          where: { id: approval.id },
          data: {
            status: ApprovalStatus.REJECTED,
            completedAt: new Date(),
          },
        });

        await (tx as any)[entityConfig.modelName].update({
          where: { id: approval.recordId },
          data: { status: entityConfig.rejectedStatus },
        });
      } else {
        const isLastStep = currentStep.step >= approval.totalSteps;

        if (isLastStep) {
          await tx.approval.update({
            where: { id: approval.id },
            data: {
              status: ApprovalStatus.APPROVED,
              currentStep: currentStep.step,
              completedAt: new Date(),
            },
          });

          await (tx as any)[entityConfig.modelName].update({
            where: { id: approval.recordId },
            data: { status: OrderStatus.APPROVED },
          });
        } else {
          await tx.approval.update({
            where: { id: approval.id },
            data: { currentStep: currentStep.step + 1 },
          });
        }
      }

      return tx.approval.findUnique({
        where: { id: approval.id },
        include: {
          steps: {
            orderBy: { step: "asc" },
            include: {
              decidedBy: {
                select: { id: true, name: true, surname: true, email: true },
              },
            },
          },
          requestedBy: {
            select: { id: true, name: true, surname: true, email: true },
          },
        },
      });
    });

    if (ctx.req) {
      logUserActivity(ctx.req, {
        operation: LogOperation.UPDATE,
        category: LogCategory.WRITE,
        tableName: "approvals",
        recordId: approval.id,
        newState: updatedApproval as any,
        userId: ctx.userId,
        userEmail: ctx.userEmail || "system",
        requestId: ctx.requestId,
      });
    }

    await this.sendApprovalNotifications(
      approval.entityType,
      approval.recordId,
      action,
      currentStep.step,
      approval.totalSteps,
      approval.requestedById,
      user,
      ctx
    );

    this.recalculateMetricsForOrder(
      approval.entityType,
      approval.recordId
    ).catch((err) =>
      console.error(
        "[ApprovalService] Supplier metrics recalculation failed:",
        err
      )
    );

    return updatedApproval;
  }

  private getEntityConfig(entityType: string): {
    modelName: string;
    approvedStatus: string;
    rejectedStatus: string;
  } | null {
    const configs: Record<
      string,
      { modelName: string; approvedStatus: string; rejectedStatus: string }
    > = {
      [ApprovalEntityType.GAS_ORDER]: {
        modelName: "gasPurchaseOrder",
        approvedStatus: OrderStatus.APPROVED,
        rejectedStatus: OrderStatus.CANCELLED,
      },
      [ApprovalEntityType.GAS_BOTTLE_ORDER]: {
        modelName: "gasBottlePurchaseOrder",
        approvedStatus: OrderStatus.APPROVED,
        rejectedStatus: OrderStatus.CANCELLED,
      },
      [ApprovalEntityType.ACCESSORY_ORDER]: {
        modelName: "accessoryPurchaseOrder",
        approvedStatus: OrderStatus.APPROVED,
        rejectedStatus: OrderStatus.CANCELLED,
      },
    };

    return configs[entityType] || null;
  }

  private async sendApprovalNotifications(
    entityType: string,
    recordId: string,
    action: string,
    completedStep: number,
    totalSteps: number,
    requestedById: string,
    decidedByUser: { name: string; surname: string },
    ctx: ServiceContext
  ): Promise<void> {
    const refTable = this.getRefTable(entityType);

    try {
      if (action === "REJECTED") {
        sendAndDispatch({
          type: NotificationType.APPROVAL_REJECTED,
          priority: NotificationPriority.HIGH,
          target: { type: "user", userId: requestedById },
          titleEnglish: "Order Rejected",
          titleFrench: "Commande rejetée",
          bodyEnglish: `Your order has been rejected at approval step ${completedStep} by ${decidedByUser.name} ${decidedByUser.surname}.`,
          bodyFrench: `Votre commande a été rejetée à l'étape d'approbation ${completedStep} par ${decidedByUser.name} ${decidedByUser.surname}.`,
          refTable,
          refId: recordId,
          data: { recordId, action: "REJECTED", step: completedStep },
        }).catch((err) =>
          console.error("[ApprovalService] Notification failed:", err)
        );
      } else if (completedStep >= totalSteps) {
        sendAndDispatch({
          type: NotificationType.APPROVAL_APPROVED,
          priority: NotificationPriority.HIGH,
          target: { type: "user", userId: requestedById },
          titleEnglish: "Order Fully Approved",
          titleFrench: "Commande entièrement approuvée",
          bodyEnglish: `Your order has been fully approved by ${decidedByUser.name} ${decidedByUser.surname}.`,
          bodyFrench: `Votre commande a été entièrement approuvée par ${decidedByUser.name} ${decidedByUser.surname}.`,
          refTable,
          refId: recordId,
          data: { recordId, action: "APPROVED", step: completedStep },
        }).catch((err) =>
          console.error("[ApprovalService] Notification failed:", err)
        );
      } else {
        sendAndDispatch({
          type: NotificationType.APPROVAL_APPROVED,
          priority: NotificationPriority.NORMAL,
          target: { type: "user", userId: requestedById },
          titleEnglish: `Approval Step ${completedStep} Completed`,
          titleFrench: `Étape d'approbation ${completedStep} terminée`,
          bodyEnglish: `Approval step ${completedStep} of ${totalSteps} has been approved by ${decidedByUser.name} ${decidedByUser.surname}.`,
          bodyFrench: `L'étape d'approbation ${completedStep} sur ${totalSteps} a été approuvée par ${decidedByUser.name} ${decidedByUser.surname}.`,
          refTable,
          refId: recordId,
          data: { recordId, action: "APPROVED", step: completedStep },
        }).catch((err) =>
          console.error("[ApprovalService] Notification failed:", err)
        );

        const nextStepNumber = completedStep + 1;
        const approvalRecord = await prisma.approval.findFirst({
          where: { recordId },
          include: { steps: true },
        });

        if (approvalRecord) {
          const nextStep = approvalRecord.steps.find(
            (s) => s.step === nextStepNumber
          );
          if (nextStep) {
            const roleName = APPROVAL_ROLE_TO_NAME[nextStep.role];
            if (roleName) {
              const role = await prisma.role.findFirst({
                where: { name: roleName },
              });

              if (role) {
                sendAndDispatch({
                  type: NotificationType.APPROVAL_REQUIRED,
                  priority: NotificationPriority.HIGH,
                  target: { type: "role", roleId: role.id },
                  titleEnglish: "Order Pending Your Approval",
                  titleFrench: "Commande en attente de votre approbation",
                  bodyEnglish: `An order is waiting for your approval (step ${nextStepNumber} of ${totalSteps}).`,
                  bodyFrench: `Une commande attend votre approbation (étape ${nextStepNumber} sur ${totalSteps}).`,
                  refTable,
                  refId: recordId,
                  data: {
                    recordId,
                    action: "PENDING",
                    step: nextStepNumber,
                  },
                }).catch((err) =>
                  console.error("[ApprovalService] Notification failed:", err)
                );
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("[ApprovalService] sendApprovalNotifications error:", err);
    }
  }

  private getRefTable(entityType: string): string {
    const tableMapping: Record<string, string> = {
      [ApprovalEntityType.GAS_ORDER]: "gas_purchase_orders",
      [ApprovalEntityType.GAS_BOTTLE_ORDER]: "gas_bottle_purchase_orders",
      [ApprovalEntityType.ACCESSORY_ORDER]: "accessory_purchase_orders",
    };
    return tableMapping[entityType] || "approvals";
  }

  private async recalculateMetricsForOrder(
    entityType: string,
    recordId: string
  ): Promise<void> {
    try {
      let supplierId: string | null = null;

      if (entityType === ApprovalEntityType.GAS_ORDER) {
        const order = await prisma.gasPurchaseOrder.findUnique({
          where: { id: recordId },
          select: { supplierId: true },
        });
        supplierId = order?.supplierId ?? null;
      } else if (entityType === ApprovalEntityType.GAS_BOTTLE_ORDER) {
        const order = await prisma.gasBottlePurchaseOrder.findUnique({
          where: { id: recordId },
          select: { supplierId: true },
        });
        supplierId = order?.supplierId ?? null;
      } else if (entityType === ApprovalEntityType.ACCESSORY_ORDER) {
        const order = await prisma.accessoryPurchaseOrder.findUnique({
          where: { id: recordId },
          select: { supplierId: true },
        });
        supplierId = order?.supplierId ?? null;
      }

      if (supplierId) {
        await recalculateSupplierMetrics(supplierId);
      }
    } catch (err) {
      console.error(
        "[ApprovalService] recalculateMetricsForOrder failed:",
        err
      );
    }
  }
}
