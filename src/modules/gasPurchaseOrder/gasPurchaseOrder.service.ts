import { BaseService } from "src/base/BaseService";
import { GasPurchaseOrderRepository } from "./gasPurchaseOrder.repository";
import {
  createGasPurchaseOrderSchema,
  updateGasPurchaseOrderSchema,
  CreateGasPurchaseOrderInput,
  UpdateGasPurchaseOrderInput,
} from "./gasPurchaseOrder.schema";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import {
  GasPurchaseOrder,
  ConfigType,
  OrderStatus,
  TankerStatus,
  ApprovalEntityType,
  ApprovalStatus,
  ApprovalRole,
  Prisma,
  NotificationType,
  NotificationPriority,
} from "src/generated/prisma";
import prisma from "@models/index.model";
import generateReference from "@utils/generateOrderReference.util";
import CalculateOrderTotals from "@utils/CalculateOrderTotals.util";
import { logUserActivity } from "@utils/logUserActivity.util";
import { LogCategory, LogOperation } from "@appTypes/log.type";
import { sendAndDispatch } from "@services/nofication/notification.dispatcher";

export class GasPurchaseOrderService extends BaseService<
  GasPurchaseOrder,
  CreateGasPurchaseOrderInput,
  UpdateGasPurchaseOrderInput
> {
  protected repository: GasPurchaseOrderRepository;
  protected tableName = "gas_purchase_orders";
  protected createSchema = createGasPurchaseOrderSchema;
  protected updateSchema = updateGasPurchaseOrderSchema;

  constructor() {
    super();
    this.repository = new GasPurchaseOrderRepository();
  }

  // ─── Create Full Order (single request, single transaction) ────────────────
  async createOrder(
    data: CreateGasPurchaseOrderInput,
    ctx: ServiceContext
  ): Promise<any> {
    // Validate input
    const result = createGasPurchaseOrderSchema.safeParse(data);
    if (!result.success) {
      const messages = result.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new AppError(messages, StatusCodes.BAD_REQUEST);
    }
    const validData = result.data;

    // ── Pre-transaction validations ──────────────────────────────────────────

    // Validate depot exists
    const depot = await prisma.exploitationDepot.findFirst({
      where: { id: validData.depotId, deletedAt: null },
    });
    if (!depot) {
      throw new AppError(
        "error.gas_order.depot_not_found",
        StatusCodes.NOT_FOUND
      );
    }

    // Validate supplier exists and is a GAS supplier
    const supplier = await prisma.supplier.findFirst({
      where: { id: validData.supplierId, deletedAt: null },
    });
    if (!supplier) {
      throw new AppError(
        "error.gas_order.supplier_not_found",
        StatusCodes.NOT_FOUND
      );
    }
    if (supplier.type !== "GAS" && supplier.type !== "MULTIPLE") {
      throw new AppError(
        "error.gas_order.supplier_not_gas_type",
        StatusCodes.BAD_REQUEST
      );
    }

    // Snapshot finance settings
    const financeSettings = await prisma.financeSettings.findUnique({
      where: { id: ConfigType.MAIN },
    });
    if (!financeSettings) {
      throw new AppError(
        "error.gas_order.finance_settings_not_found",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // Find CEO and Accountant roles — blow up if missing
    const ceoRole = await prisma.role.findFirst({
      where: { name: "Directeur Général (CEO)" },
    });
    if (!ceoRole) {
      throw new AppError(
        "error.gas_order.ceo_role_not_found",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const accountantRole = await prisma.role.findFirst({
      where: { name: "Comptable (Accountant)" },
    });
    if (!accountantRole) {
      throw new AppError(
        "error.gas_order.accountant_role_not_found",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // Verify users with approval roles exist — blow up if missing
    const ceoUsers = await prisma.user.findMany({
      where: { roleId: ceoRole.id, deletedAt: null, status: "ACTIVE" },
      select: { id: true, email: true, name: true, surname: true },
    });
    if (ceoUsers.length === 0) {
      throw new AppError(
        "error.gas_order.no_ceo_account_found",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const accountantUsers = await prisma.user.findMany({
      where: { roleId: accountantRole.id, deletedAt: null, status: "ACTIVE" },
      select: { id: true, email: true, name: true, surname: true },
    });
    if (accountantUsers.length === 0) {
      throw new AppError(
        "error.gas_order.no_accountant_account_found",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // ── Single transaction — order + tankers + items + totals + approval ─────
    const { order, approval } = await prisma.$transaction(async (tx) => {
      // 1. Generate reference and create order
      const reference = await generateReference(tx, "GAS_PO" as any);

      const createdOrder = await tx.gasPurchaseOrder.create({
        data: {
          reference,
          status: OrderStatus.PENDING_APPROVAL,
          priority: validData.priority || "NORMAL",
          currency: validData.currency || "XAF",
          vatPct: financeSettings.vatPct,
          regulatoryTaxPct: financeSettings.regulatoryTax,
          depotId: validData.depotId,
          supplierId: validData.supplierId,
          createdById: ctx.userId!,
          notes: validData.notes,
          internalNotes: validData.internalNotes,
          requestedDate: validData.requestedDate || undefined,
          collectionDate: validData.collectionDate || undefined,
        },
      });

      // 2. Validate and assign tankers
      for (const tankerInput of validData.tankers) {
        const tanker = await tx.tanker.findFirst({
          where: { id: tankerInput.tankerId, deletedAt: null },
          include: { driver: true },
        });

        if (!tanker) {
          throw new AppError(
            "error.gas_order.tanker_not_found",
            StatusCodes.NOT_FOUND
          );
        }

        if (
          tanker.status !== TankerStatus.AVAILABLE &&
          tanker.status !== TankerStatus.IDLE
        ) {
          throw new AppError(
            "error.gas_order.tanker_not_available",
            StatusCodes.BAD_REQUEST
          );
        }

        if (!tanker.driver.isCertified) {
          throw new AppError(
            "error.gas_order.driver_not_certified",
            StatusCodes.BAD_REQUEST
          );
        }

        await tx.gasPurchaseOrderTanker.create({
          data: {
            orderId: createdOrder.id,
            tankerId: tankerInput.tankerId,
            driverId: tanker.driverId,
            collectionDate: tankerInput.collectionDate || undefined,
          },
        });
      }

      // 3. Create line items
      for (const item of validData.lineItems) {
        const lineTotal = new Prisma.Decimal(item.quantity).mul(
          new Prisma.Decimal(item.unitPrice)
        );

        await tx.gasPurchaseOrderItem.create({
          data: {
            orderId: createdOrder.id,
            code: item.code,
            name: item.name,
            description: item.description,
            grade: item.grade,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            lineTotal,
          },
        });
      }

      // 4. Calculate totals
      const refreshedOrder = await tx.gasPurchaseOrder.findUnique({
        where: { id: createdOrder.id },
      });
      await CalculateOrderTotals.gasPurchaseOrder(refreshedOrder!, tx);

      // 5. Create approval chain
      const createdApproval = await tx.approval.create({
        data: {
          entityType: ApprovalEntityType.GAS_ORDER,
          refTable: "gas_purchase_orders",
          recordId: createdOrder.id,
          status: ApprovalStatus.PENDING,
          currentStep: 1,
          totalSteps: 2,
          requestedById: ctx.userId!,
        },
      });

      // Step 1: CEO
      await tx.approvalStep.create({
        data: {
          approvalId: createdApproval.id,
          step: 1,
          role: ApprovalRole.CEO,
          status: ApprovalStatus.PENDING,
        },
      });

      // Step 2: Accounting
      await tx.approvalStep.create({
        data: {
          approvalId: createdApproval.id,
          step: 2,
          role: ApprovalRole.ACCOUNTING,
          status: ApprovalStatus.PENDING,
        },
      });

      // 6. Fetch the full order for response
      const fullOrder = await tx.gasPurchaseOrder.findUnique({
        where: { id: createdOrder.id },
        include: {
          lineItems: true,
          tankers: {
            include: {
              tanker: true,
              driver: {
                include: {
                  user: {
                    select: { id: true, name: true, surname: true, email: true },
                  },
                },
              },
            },
          },
          supplier: true,
          depot: true,
          createdBy: {
            select: { id: true, name: true, surname: true, email: true },
          },
        },
      });

      const fullApproval = await tx.approval.findUnique({
        where: { id: createdApproval.id },
        include: { steps: { orderBy: { step: "asc" } } },
      });

      return { order: fullOrder!, approval: fullApproval! };
    });

    // ── Post-transaction: log + notify (non-blocking) ────────────────────────

    // Log activity
    if (ctx.req) {
      logUserActivity(ctx.req, {
        operation: LogOperation.CREATE,
        category: LogCategory.WRITE,
        tableName: this.tableName,
        recordId: order.id,
        newState: order as any,
        userId: ctx.userId,
        userEmail: ctx.userEmail || "system",
        requestId: ctx.requestId,
      });
    }

    // Notify CEO users
    for (const ceo of ceoUsers) {
      sendAndDispatch({
        type: NotificationType.ORDER_SUBMITTED,
        priority: NotificationPriority.HIGH,
        target: { type: "user", userId: ceo.id },
        titleEnglish: "Gas Purchase Order Pending Approval",
        titleFrench: "Bon de commande de gaz en attente d'approbation",
        bodyEnglish: `Gas purchase order ${order.reference} has been submitted for your approval.`,
        bodyFrench: `Le bon de commande de gaz ${order.reference} a été soumis pour votre approbation.`,
        refTable: "gas_purchase_orders",
        refId: order.id,
        data: { orderId: order.id, reference: order.reference },
      }).catch((err) =>
        console.error("[GasPurchaseOrderService] Notification failed:", err)
      );
    }

    return {
      ...order,
      approval: {
        id: approval.id,
        status: approval.status,
        currentStep: approval.currentStep,
        totalSteps: approval.totalSteps,
        steps: approval.steps,
      },
    };
  }

  // ─── Get Full Order Summary ────────────────────────────────────────────────
  async getOrderSummary(
    orderId: string,
    ctx: ServiceContext
  ): Promise<any> {
    const order = await prisma.gasPurchaseOrder.findFirst({
      where: { id: orderId, deletedAt: null },
      include: {
        lineItems: true,
        tankers: {
          include: {
            tanker: true,
            driver: {
              include: {
                user: {
                  select: { id: true, name: true, surname: true, email: true },
                },
              },
            },
          },
        },
        supplier: {
          include: {
            contacts: true,
            addresses: true,
          },
        },
        depot: true,
        createdBy: {
          select: { id: true, name: true, surname: true, email: true },
        },
      },
    });

    if (!order) {
      throw new AppError(
        "error.gas_order.not_found",
        StatusCodes.NOT_FOUND
      );
    }

    // Fetch related approval
    const approval = await prisma.approval.findFirst({
      where: {
        recordId: orderId,
        entityType: ApprovalEntityType.GAS_ORDER,
      },
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

    return {
      ...order,
      approval: approval || null,
    };
  }

  // ─── Override update — block if approved ───────────────────────────────────
  async update(
    id: string,
    data: UpdateGasPurchaseOrderInput,
    ctx: ServiceContext
  ): Promise<GasPurchaseOrder> {
    const order = await prisma.gasPurchaseOrder.findFirst({
      where: { id, deletedAt: null },
    });

    if (!order) {
      throw new AppError("error.gas_order.not_found", StatusCodes.NOT_FOUND);
    }

    if (order.status !== OrderStatus.DRAFT) {
      throw new AppError(
        "error.gas_order.cannot_edit_non_draft",
        StatusCodes.BAD_REQUEST
      );
    }

    return super.update(id, data, ctx);
  }

  // ─── Override delete — approved orders: only final approver can delete ─────
  async delete(
    id: string,
    ctx: ServiceContext,
    soft: boolean = true
  ): Promise<GasPurchaseOrder> {
    const order = await prisma.gasPurchaseOrder.findFirst({
      where: { id, deletedAt: null },
    });

    if (!order) {
      throw new AppError("error.gas_order.not_found", StatusCodes.NOT_FOUND);
    }

    // Cannot delete orders that are in transit or completed
    if (
      order.status === OrderStatus.IN_TRANSIT ||
      order.status === OrderStatus.COMPLETED
    ) {
      throw new AppError(
        "error.gas_order.cannot_delete_active_order",
        StatusCodes.BAD_REQUEST
      );
    }

    // If approved — only the user who performed the final approval can delete
    if (order.status === OrderStatus.APPROVED) {
      const approval = await prisma.approval.findFirst({
        where: {
          recordId: id,
          entityType: ApprovalEntityType.GAS_ORDER,
          status: ApprovalStatus.APPROVED,
        },
        include: {
          steps: { orderBy: { step: "desc" }, take: 1 },
        },
      });

      if (!approval || !approval.steps[0]) {
        throw new AppError(
          "error.gas_order.approval_not_found",
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      const finalApprover = approval.steps[0].decidedById;
      if (finalApprover !== ctx.userId) {
        throw new AppError(
          "error.gas_order.only_final_approver_can_delete",
          StatusCodes.FORBIDDEN
        );
      }
    }

    if (soft) {
      return this.repository.softDelete(id, ["reference"]);
    }
    return this.repository.delete(id);
  }
}
