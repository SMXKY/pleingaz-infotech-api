import { BaseService } from "src/base/BaseService";
import { GasBottlePurchaseOrderRepository } from "./gasBottlePurchaseOrders.repository";
import {
  createGasBottlePurchaseOrderSchema,
  updateGasBottlePurchaseOrderSchema,
  CreateGasBottlePurchaseOrderInput,
  UpdateGasBottlePurchaseOrderInput,
} from "./gasBottlePurchaseOrders.schema";

import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import {
  GasBottlePurchaseOrder,
  ConfigType,
  OrderStatus,
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

const FULL_ORDER_INCLUDE = {
  lineItems: {
    include: {
      bottleType: true,
    },
  },
  supplier: {
    include: {
      contacts: { where: { deletedAt: null, isPrimary: true } },
      addresses: { where: { deletedAt: null, isDefault: true } },
    },
  },
  depot: true,
  createdBy: {
    select: { id: true, name: true, surname: true, email: true },
  },
} as const;

export class GasBottlePurchaseOrderService extends BaseService<
  GasBottlePurchaseOrder,
  CreateGasBottlePurchaseOrderInput,
  UpdateGasBottlePurchaseOrderInput
> {
  protected repository: GasBottlePurchaseOrderRepository;
  protected tableName = "gas_bottle_purchase_orders";
  protected createSchema = createGasBottlePurchaseOrderSchema;
  protected updateSchema = updateGasBottlePurchaseOrderSchema;

  constructor() {
    super();
    this.repository = new GasBottlePurchaseOrderRepository();
  }

  async create(
    data: CreateGasBottlePurchaseOrderInput,
    ctx: ServiceContext
  ): Promise<GasBottlePurchaseOrder> {
    const result = createGasBottlePurchaseOrderSchema.safeParse(data);
    if (!result.success) {
      const messages = result.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new AppError(messages, StatusCodes.BAD_REQUEST);
    }
    const v = result.data;

    const depot = await prisma.exploitationDepot.findFirst({
      where: { id: v.depotId, deletedAt: null, isActive: true },
    });
    if (!depot) {
      throw new AppError(
        "error.gas_bottle_order.depot_not_found",
        StatusCodes.NOT_FOUND
      );
    }

    const supplier = await prisma.supplier.findFirst({
      where: { id: v.supplierId, deletedAt: null, isActive: true },
    });
    if (!supplier) {
      throw new AppError(
        "error.gas_bottle_order.supplier_not_found",
        StatusCodes.NOT_FOUND
      );
    }
    if (supplier.type !== "BOTTLES" && supplier.type !== "MULTIPLE") {
      throw new AppError(
        "error.gas_bottle_order.supplier_not_bottle_type",
        StatusCodes.BAD_REQUEST
      );
    }

    const accountantRole = await prisma.role.findFirst({
      where: { name: "Comptable (Accountant)" },
    });
    if (!accountantRole) {
      throw new AppError(
        "error.gas_bottle_order.accountant_role_not_found",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
    const ceoRole = await prisma.role.findFirst({
      where: { name: "Directeur Général (CEO)" },
    });
    if (!ceoRole) {
      throw new AppError(
        "error.gas_bottle_order.ceo_role_not_found",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const order = await prisma.$transaction(async (tx) => {
      const reference = await generateReference(tx, "GB_PO" as any);

      const created = await tx.gasBottlePurchaseOrder.create({
        data: {
          reference,
          status: OrderStatus.PENDING_APPROVAL,
          currency: v.currency || "XAF",
          vatPct: v.vatPct,
          shippingCost: v.shippingCost ?? 0,
          depotId: v.depotId,
          supplierId: v.supplierId,
          createdById: ctx.userId!,
          notes: v.notes ?? null,
          internalNotes: v.internalNotes ?? null,
          requestedDeliveryDate: v.requestedDeliveryDate ?? null,
        },
      });

      for (const item of v.lineItems) {
        const bottleType = await tx.gasBottleType.findFirst({
          where: { id: item.bottleTypeId, deletedAt: null, isActive: true },
        });
        if (!bottleType) {
          throw new AppError(
            "error.gas_bottle_order.bottle_type_not_found",
            StatusCodes.NOT_FOUND
          );
        }

        const lineTotal = new Prisma.Decimal(item.quantity).mul(
          new Prisma.Decimal(item.unitPrice)
        );

        await tx.gasBottlePurchaseOrderItem.create({
          data: {
            orderId: created.id,
            bottleTypeId: item.bottleTypeId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal,
          },
        });
      }

      await CalculateOrderTotals.gasBottlePurchaseOrder(created, tx);

      const approval = await tx.approval.create({
        data: {
          entityType: ApprovalEntityType.GAS_BOTTLE_ORDER,
          refTable: "gas_bottle_purchase_orders",
          recordId: created.id,
          status: ApprovalStatus.PENDING,
          currentStep: 1,
          totalSteps: 2,
          requestedById: ctx.userId!,
        },
      });

      await tx.approvalStep.create({
        data: {
          approvalId: approval.id,
          step: 1,
          role: ApprovalRole.ACCOUNTING,
          status: ApprovalStatus.PENDING,
        },
      });

      await tx.approvalStep.create({
        data: {
          approvalId: approval.id,
          step: 2,
          role: ApprovalRole.CEO,
          status: ApprovalStatus.PENDING,
        },
      });

      return tx.gasBottlePurchaseOrder.findUniqueOrThrow({
        where: { id: created.id },
        include: FULL_ORDER_INCLUDE,
      });
    });

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

    this.notifyRole(
      accountantRole.id,
      order,
      NotificationType.ORDER_SUBMITTED,
      NotificationPriority.HIGH,
      "Gas Bottle Purchase Order Pending Your Approval",
      "Bon de commande de bouteilles de gaz en attente de votre approbation",
      `Gas bottle purchase order ${order.reference} has been created and requires your approval.`,
      `Le bon de commande de bouteilles de gaz ${order.reference} a été créé et nécessite votre approbation.`
    );

    this.notifyRole(
      ceoRole.id,
      order,
      NotificationType.ORDER_CREATED,
      NotificationPriority.NORMAL,
      "New Gas Bottle Purchase Order Created",
      "Nouveau bon de commande de bouteilles de gaz créé",
      `Gas bottle purchase order ${order.reference} has been created and is pending accounting approval.`,
      `Le bon de commande de bouteilles de gaz ${order.reference} a été créé et est en attente d'approbation comptable.`
    );

    return order;
  }

  async update(
    id: string,
    data: UpdateGasBottlePurchaseOrderInput,
    ctx: ServiceContext
  ): Promise<GasBottlePurchaseOrder> {
    const result = updateGasBottlePurchaseOrderSchema.safeParse(data);
    if (!result.success) {
      const messages = result.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new AppError(messages, StatusCodes.BAD_REQUEST);
    }
    const v = result.data;

    const order = await prisma.gasBottlePurchaseOrder.findFirst({
      where: { id, deletedAt: null },
    });
    if (!order) {
      throw new AppError(
        "error.gas_bottle_order.not_found",
        StatusCodes.NOT_FOUND
      );
    }

    await this.assertEditable(id);

    const depot = await prisma.exploitationDepot.findFirst({
      where: { id: v.depotId, deletedAt: null, isActive: true },
    });
    if (!depot) {
      throw new AppError(
        "error.gas_bottle_order.depot_not_found",
        StatusCodes.NOT_FOUND
      );
    }

    const supplier = await prisma.supplier.findFirst({
      where: { id: v.supplierId, deletedAt: null, isActive: true },
    });
    if (!supplier) {
      throw new AppError(
        "error.gas_bottle_order.supplier_not_found",
        StatusCodes.NOT_FOUND
      );
    }
    if (supplier.type !== "BOTTLES" && supplier.type !== "MULTIPLE") {
      throw new AppError(
        "error.gas_bottle_order.supplier_not_bottle_type",
        StatusCodes.BAD_REQUEST
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.gasBottlePurchaseOrder.update({
        where: { id },
        data: {
          depotId: v.depotId,
          supplierId: v.supplierId,
          currency: v.currency || order.currency,
          vatPct: v.vatPct,
          shippingCost: v.shippingCost ?? order.shippingCost,
          notes: v.notes ?? null,
          internalNotes: v.internalNotes ?? null,
          requestedDeliveryDate: v.requestedDeliveryDate ?? null,
        },
      });

      await tx.gasBottlePurchaseOrderItem.deleteMany({
        where: { orderId: id },
      });

      for (const item of v.lineItems) {
        const bottleType = await tx.gasBottleType.findFirst({
          where: { id: item.bottleTypeId, deletedAt: null, isActive: true },
        });
        if (!bottleType) {
          throw new AppError(
            "error.gas_bottle_order.bottle_type_not_found",
            StatusCodes.NOT_FOUND
          );
        }

        const lineTotal = new Prisma.Decimal(item.quantity).mul(
          new Prisma.Decimal(item.unitPrice)
        );

        await tx.gasBottlePurchaseOrderItem.create({
          data: {
            orderId: id,
            bottleTypeId: item.bottleTypeId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal,
          },
        });
      }

      const refreshedOrder = await tx.gasBottlePurchaseOrder.findUniqueOrThrow({
        where: { id },
      });
      await CalculateOrderTotals.gasBottlePurchaseOrder(refreshedOrder, tx);

      return tx.gasBottlePurchaseOrder.findUniqueOrThrow({
        where: { id },
        include: FULL_ORDER_INCLUDE,
      });
    });

    if (ctx.req) {
      logUserActivity(ctx.req, {
        operation: LogOperation.UPDATE,
        category: LogCategory.WRITE,
        tableName: this.tableName,
        recordId: id,
        previousState: order as any,
        newState: updated as any,
        changedFields: [
          "depotId",
          "supplierId",
          "vatPct",
          "shippingCost",
          "lineItems",
          "subTotal",
          "vatAmount",
          "total",
        ],
        userId: ctx.userId,
        userEmail: ctx.userEmail || "system",
        requestId: ctx.requestId,
      });
    }

    return updated;
  }

  async delete(
    id: string,
    ctx: ServiceContext,
    soft: boolean = true
  ): Promise<GasBottlePurchaseOrder> {
    const order = await prisma.gasBottlePurchaseOrder.findFirst({
      where: { id, deletedAt: null },
    });
    if (!order) {
      throw new AppError(
        "error.gas_bottle_order.not_found",
        StatusCodes.NOT_FOUND
      );
    }

    if (
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.IN_TRANSIT
    ) {
      throw new AppError(
        "error.gas_bottle_order.cannot_delete_active_order",
        StatusCodes.BAD_REQUEST
      );
    }

    await this.assertEditable(id);

    if (ctx.req) {
      logUserActivity(ctx.req, {
        operation: LogOperation.DELETE,
        category: LogCategory.WRITE,
        tableName: this.tableName,
        recordId: id,
        previousState: order as any,
        userId: ctx.userId,
        userEmail: ctx.userEmail || "system",
        requestId: ctx.requestId,
      });
    }

    if (soft) {
      return this.repository.softDelete(id, ["reference"]);
    }
    return this.repository.delete(id);
  }

  async cancelOrder(
    id: string,
    ctx: ServiceContext
  ): Promise<GasBottlePurchaseOrder> {
    const order = await prisma.gasBottlePurchaseOrder.findFirst({
      where: { id, deletedAt: null },
    });
    if (!order) {
      throw new AppError(
        "error.gas_bottle_order.not_found",
        StatusCodes.NOT_FOUND
      );
    }

    if (
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new AppError(
        "error.gas_bottle_order.cannot_cancel_order",
        StatusCodes.BAD_REQUEST
      );
    }

    const approval = await prisma.approval.findFirst({
      where: {
        recordId: id,
        entityType: ApprovalEntityType.GAS_BOTTLE_ORDER,
      },
      include: { steps: { orderBy: { step: "asc" } } },
    });

    if (!approval) {
      throw new AppError(
        "error.gas_bottle_order.approval_not_found",
        StatusCodes.NOT_FOUND
      );
    }

    const lastStep = approval.steps[approval.steps.length - 1];
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId! },
      include: { role: true },
    });

    if (!user) {
      throw new AppError("error.auth.user_not_found", StatusCodes.UNAUTHORIZED);
    }

    const roleMapping: Record<string, string> = {
      [ApprovalRole.CEO]: "Directeur Général (CEO)",
      [ApprovalRole.ACCOUNTING]: "Comptable (Accountant)",
    };

    const requiredRoleName = roleMapping[lastStep.role];
    if (!requiredRoleName || user.role.name !== requiredRoleName) {
      throw new AppError(
        "error.gas_bottle_order.only_final_approver_can_cancel",
        StatusCodes.FORBIDDEN
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const cancelled = await tx.gasBottlePurchaseOrder.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
        include: FULL_ORDER_INCLUDE,
      });

      if (approval.status === ApprovalStatus.PENDING) {
        await tx.approval.update({
          where: { id: approval.id },
          data: {
            status: ApprovalStatus.REJECTED,
            completedAt: new Date(),
          },
        });
      }

      return cancelled;
    });

    if (ctx.req) {
      logUserActivity(ctx.req, {
        operation: LogOperation.UPDATE,
        category: LogCategory.WRITE,
        tableName: this.tableName,
        recordId: id,
        previousState: order as any,
        newState: updated as any,
        changedFields: ["status"],
        userId: ctx.userId,
        userEmail: ctx.userEmail || "system",
        requestId: ctx.requestId,
      });
    }

    sendAndDispatch({
      type: NotificationType.ORDER_CANCELLED,
      priority: NotificationPriority.HIGH,
      target: { type: "user", userId: order.createdById },
      titleEnglish: "Gas Bottle Purchase Order Cancelled",
      titleFrench: "Bon de commande de bouteilles de gaz annulé",
      bodyEnglish: `Gas bottle purchase order ${order.reference} has been cancelled by ${user.name} ${user.surname}.`,
      bodyFrench: `Le bon de commande de bouteilles de gaz ${order.reference} a été annulé par ${user.name} ${user.surname}.`,
      refTable: "gas_bottle_purchase_orders",
      refId: id,
      data: { orderId: id, reference: order.reference },
    }).catch((err) =>
      console.error(
        "[GasBottlePurchaseOrderService] Cancel notification failed:",
        err
      )
    );

    return updated;
  }

  async getOrderSummary(id: string, ctx: ServiceContext): Promise<any> {
    const order = await prisma.gasBottlePurchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: FULL_ORDER_INCLUDE,
    });

    if (!order) {
      throw new AppError(
        "error.gas_bottle_order.not_found",
        StatusCodes.NOT_FOUND
      );
    }

    const approval = await prisma.approval.findFirst({
      where: {
        recordId: id,
        entityType: ApprovalEntityType.GAS_BOTTLE_ORDER,
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

    return { ...order, approval };
  }

  private async assertEditable(orderId: string): Promise<void> {
    const approval = await prisma.approval.findFirst({
      where: {
        recordId: orderId,
        entityType: ApprovalEntityType.GAS_BOTTLE_ORDER,
      },
      include: { steps: true },
    });

    if (approval) {
      const hasApprovedStep = approval.steps.some(
        (s) => s.status === ApprovalStatus.APPROVED
      );
      if (hasApprovedStep) {
        throw new AppError(
          "error.gas_bottle_order.cannot_edit_approved_order",
          StatusCodes.BAD_REQUEST
        );
      }
    }
  }

  private notifyRole(
    roleId: string,
    order: GasBottlePurchaseOrder,
    type: NotificationType,
    priority: NotificationPriority,
    titleEn: string,
    titleFr: string,
    bodyEn: string,
    bodyFr: string
  ): void {
    sendAndDispatch({
      type,
      priority,
      target: { type: "role", roleId },
      titleEnglish: titleEn,
      titleFrench: titleFr,
      bodyEnglish: bodyEn,
      bodyFrench: bodyFr,
      refTable: "gas_bottle_purchase_orders",
      refId: order.id,
      data: { orderId: order.id, reference: order.reference },
    }).catch((err) =>
      console.error(
        `[GasBottlePurchaseOrderService] Notification to role ${roleId} failed:`,
        err
      )
    );
  }
}
