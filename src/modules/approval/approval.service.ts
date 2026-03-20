import { ApprovalRepository } from "./approval.repository";
import { approveOrRejectSchema, ApproveOrRejectInput } from "./approval.schema";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import {
  ApprovalEntityType,
  ApprovalStatus,
  ApprovalRole,
  OrderStatus,
  NotificationType,
  NotificationPriority,
} from "src/generated/prisma";
import prisma from "@models/index.model";
import { logUserActivity } from "@utils/logUserActivity.util";
import { LogCategory, LogOperation } from "@appTypes/log.type";
import { sendAndDispatch } from "@services/nofication/notification.dispatcher";

export class ApprovalService {
  private repository: ApprovalRepository;

  constructor() {
    this.repository = new ApprovalRepository();
  }

  // ─── Get approval status for a record ────────────────────────────────────────
  async getApprovalByRecord(
    recordId: string,
    entityType: string,
    ctx: ServiceContext
  ): Promise<any> {
    const approval = await this.repository.findByRecord(recordId, entityType);

    if (!approval) {
      throw new AppError(
        "error.approval.not_found",
        StatusCodes.NOT_FOUND
      );
    }

    return approval;
  }

  // ─── Get approval by ID ──────────────────────────────────────────────────────
  async getApprovalById(
    id: string,
    ctx: ServiceContext
  ): Promise<any> {
    const approval = await this.repository.findById(id);

    if (!approval) {
      throw new AppError(
        "error.approval.not_found",
        StatusCodes.NOT_FOUND
      );
    }

    return approval;
  }

  // ─── Approve or Reject ───────────────────────────────────────────────────────
  async approveOrReject(
    recordId: string,
    data: ApproveOrRejectInput,
    ctx: ServiceContext
  ): Promise<any> {
    // Validate input
    const result = approveOrRejectSchema.safeParse(data);
    if (!result.success) {
      const messages = result.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new AppError(messages, StatusCodes.BAD_REQUEST);
    }
    const { action, notes } = result.data;

    // Find the approval record for this order
    const approval = await prisma.approval.findFirst({
      where: { recordId },
      include: {
        steps: { orderBy: { step: "asc" } },
      },
    });

    if (!approval) {
      throw new AppError(
        "error.approval.not_found",
        StatusCodes.NOT_FOUND
      );
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new AppError(
        "error.approval.not_pending",
        StatusCodes.BAD_REQUEST
      );
    }

    // Get the current step
    const currentStep = approval.steps.find(
      (s) => s.step === approval.currentStep
    );
    if (!currentStep) {
      throw new AppError(
        "error.approval.step_not_found",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // Verify user has the right role for this step
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

    // Map ApprovalRole to actual role names
    const roleMapping: Record<string, string> = {
      [ApprovalRole.CEO]: "Directeur Général (CEO)",
      [ApprovalRole.ACCOUNTING]: "Comptable (Accountant)",
    };

    const requiredRoleName = roleMapping[currentStep.role];
    if (!requiredRoleName || user.role.name !== requiredRoleName) {
      throw new AppError(
        "error.approval.not_authorized",
        StatusCodes.FORBIDDEN
      );
    }

    // Determine entity-specific table and status field
    const entityConfig = this.getEntityConfig(approval.entityType);

    // Execute approval/rejection in a transaction
    const updatedApproval = await prisma.$transaction(async (tx) => {
      // Update the current step
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
        // Reject: update approval status, update order status
        await tx.approval.update({
          where: { id: approval.id },
          data: { status: ApprovalStatus.REJECTED },
        });

        // Update the entity status to CANCELLED
        if (entityConfig) {
          await (tx as any)[entityConfig.modelName].update({
            where: { id: recordId },
            data: { status: entityConfig.rejectedStatus },
          });
        }
      } else {
        // Approved: check if this was the last step
        const isLastStep = currentStep.step >= approval.totalSteps;

        if (isLastStep) {
          // Final approval — mark approval and entity as approved
          await tx.approval.update({
            where: { id: approval.id },
            data: {
              status: ApprovalStatus.APPROVED,
              currentStep: currentStep.step,
            },
          });

          if (entityConfig) {
            await (tx as any)[entityConfig.modelName].update({
              where: { id: recordId },
              data: { status: entityConfig.approvedStatus },
            });
          }
        } else {
          // Move to next step
          await tx.approval.update({
            where: { id: approval.id },
            data: { currentStep: currentStep.step + 1 },
          });
        }
      }

      // Return updated approval
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

    // ── Post-transaction: log + notify ──────────────────────────────────────────

    // Log activity
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

    // Send notifications based on action
    await this.sendApprovalNotifications(
      approval.entityType,
      recordId,
      action,
      currentStep.step,
      approval.totalSteps,
      approval.requestedById,
      ctx
    );

    return updatedApproval;
  }

  // ─── Entity Configuration ────────────────────────────────────────────────────
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
    };

    return configs[entityType] || null;
  }

  // ─── Send Approval Notifications ─────────────────────────────────────────────
  private async sendApprovalNotifications(
    entityType: string,
    recordId: string,
    action: string,
    completedStep: number,
    totalSteps: number,
    requestedById: string,
    ctx: ServiceContext
  ): Promise<void> {
    try {
      if (action === "REJECTED") {
        // Notify the requester that the order was rejected
        sendAndDispatch({
          type: NotificationType.ORDER_STATUS_CHANGED,
          priority: NotificationPriority.HIGH,
          target: { type: "user", userId: requestedById },
          titleEnglish: "Order Rejected",
          titleFrench: "Commande rejetée",
          bodyEnglish: `Your order has been rejected at approval step ${completedStep}.`,
          bodyFrench: `Votre commande a été rejetée à l'étape d'approbation ${completedStep}.`,
          refTable: this.getRefTable(entityType),
          refId: recordId,
          data: { recordId, action: "REJECTED", step: completedStep },
        }).catch((err) =>
          console.error("[ApprovalService] Notification failed:", err)
        );
      } else if (completedStep >= totalSteps) {
        // Final approval — notify requester
        sendAndDispatch({
          type: NotificationType.ORDER_STATUS_CHANGED,
          priority: NotificationPriority.HIGH,
          target: { type: "user", userId: requestedById },
          titleEnglish: "Order Approved",
          titleFrench: "Commande approuvée",
          bodyEnglish: `Your order has been fully approved.`,
          bodyFrench: `Votre commande a été entièrement approuvée.`,
          refTable: this.getRefTable(entityType),
          refId: recordId,
          data: { recordId, action: "APPROVED", step: completedStep },
        }).catch((err) =>
          console.error("[ApprovalService] Notification failed:", err)
        );
      } else {
        // Move to next step — notify the next approver role
        const nextStepNumber = completedStep + 1;
        const approval = await prisma.approval.findFirst({
          where: { recordId },
          include: { steps: true },
        });

        if (approval) {
          const nextStep = approval.steps.find(
            (s) => s.step === nextStepNumber
          );
          if (nextStep) {
            const roleMapping: Record<string, string> = {
              [ApprovalRole.CEO]: "Directeur Général (CEO)",
              [ApprovalRole.ACCOUNTING]: "Comptable (Accountant)",
            };

            const roleName = roleMapping[nextStep.role];
            if (roleName) {
              const role = await prisma.role.findFirst({
                where: { name: roleName },
              });

              if (role) {
                const nextApprovers = await prisma.user.findMany({
                  where: {
                    roleId: role.id,
                    deletedAt: null,
                    status: "ACTIVE",
                  },
                  select: { id: true },
                });

                for (const approver of nextApprovers) {
                  sendAndDispatch({
                    type: NotificationType.ORDER_SUBMITTED,
                    priority: NotificationPriority.HIGH,
                    target: { type: "user", userId: approver.id },
                    titleEnglish: "Order Pending Your Approval",
                    titleFrench: "Commande en attente de votre approbation",
                    bodyEnglish: `An order is waiting for your approval (step ${nextStepNumber} of ${totalSteps}).`,
                    bodyFrench: `Une commande attend votre approbation (étape ${nextStepNumber} sur ${totalSteps}).`,
                    refTable: this.getRefTable(entityType),
                    refId: recordId,
                    data: {
                      recordId,
                      action: "PENDING",
                      step: nextStepNumber,
                    },
                  }).catch((err) =>
                    console.error(
                      "[ApprovalService] Notification failed:",
                      err
                    )
                  );
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("[ApprovalService] sendApprovalNotifications error:", err);
    }
  }

  // ─── Get ref table for entity type ────────────────────────────────────────────
  private getRefTable(entityType: string): string {
    const tableMapping: Record<string, string> = {
      [ApprovalEntityType.GAS_ORDER]: "gas_purchase_orders",
    };
    return tableMapping[entityType] || "approvals";
  }
}
