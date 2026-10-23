import { BaseService } from "src/base/BaseService";
import { AccessoryPurchaseOrderRepository } from "./accessoryPurchaseOrder.repository";
import {
  createAccessoryPurchaseOrderSchema,
  updateAccessoryPurchaseOrderSchema,
  CreateAccessoryPurchaseOrderInput,
  UpdateAccessoryPurchaseOrderInput,
} from "./accessoryPurchaseOrder.schema";

import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import {
  AccessoryPurchaseOrder,
  OrderStatus,
  ApprovalEntityType,
  ApprovalStatus,
  ApprovalRole,
  Prisma,
  NotificationType,
  NotificationPriority,
  SequenceType,
} from "src/generated/prisma";
import prisma from "@models/index.model";
import generateReference from "@utils/generateOrderReference.util";
import CalculateOrderTotals from "@utils/CalculateOrderTotals.util";
import { logUserActivity } from "@utils/logUserActivity.util";
import { LogCategory, LogOperation } from "@appTypes/log.type";
import { sendAndDispatch } from "@services/notification/notification.dispatcher";
import { recalculateSupplierMetrics } from "@utils/recalculateSupplierMetrics.util";

const FULL_ORDER_INCLUDE = {
  lineItems: {
    include: {
      item: {
        include: {
          category: true,
        },
      },
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

export class AccessoryPurchaseOrderService extends BaseService<
  AccessoryPurchaseOrder,
  CreateAccessoryPurchaseOrderInput,
  UpdateAccessoryPurchaseOrderInput
> {
  protected repository: AccessoryPurchaseOrderRepository;
  protected tableName = "accessory_purchase_orders";
  protected createSchema = createAccessoryPurchaseOrderSchema;
  protected updateSchema = updateAccessoryPurchaseOrderSchema;

  constructor() {
    super();
    this.repository = new AccessoryPurchaseOrderRepository();
  }

  async create(
    data: CreateAccessoryPurchaseOrderInput,
    ctx: ServiceContext
  ): Promise<AccessoryPurchaseOrder> {
    const result = createAccessoryPurchaseOrderSchema.safeParse(data);
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
        "error.accessory_order.depot_not_found",
        StatusCodes.NOT_FOUND
      );
    }

    const supplier = await prisma.supplier.findFirst({
      where: { id: v.supplierId, deletedAt: null, isActive: true },
    });
    if (!supplier) {
      throw new AppError(
        "error.accessory_order.supplier_not_found",
        StatusCodes.NOT_FOUND
      );
    }
    if (supplier.type !== "ACCESSORIES" && supplier.type !== "MULTIPLE") {
      throw new AppError(
        "error.accessory_order.supplier_not_accessory_type",
        StatusCodes.BAD_REQUEST
      );
    }

    const accountantRole = await prisma.role.findFirst({
      where: { name: "Comptable (Accountant)" },
    });
    if (!accountantRole) {
      throw new AppError(
        "error.accessory_order.accountant_role_not_found",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
    const ceoRole = await prisma.role.findFirst({
      where: { name: "Directeur Général (CEO)" },
    });
    if (!ceoRole) {
      throw new AppError(
        "error.accessory_order.ceo_role_not_found",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const order = await prisma.$transaction(async (tx) => {
      const reference = await generateReference(
        tx,
        SequenceType.ACCESSORY_PO as any
      );

      const created = await tx.accessoryPurchaseOrder.create({
        data: {
          reference,
          status: OrderStatus.PENDING_APPROVAL,
          currency: v.currency || "XAF",
          vatPct: v.vatPct,
          transportMode: v.transportMode,
          estimatedTransitDays: v.estimatedTransitDays ?? null,
          estimatedArrivalDate: v.estimatedArrivalDate ?? null,
          preferredCarrier: v.preferredCarrier ?? null,
          logisticsNotes: v.logisticsNotes ?? null,
          freightFees: v.freightFees ?? 0,
          customsDuties: v.customsDuties ?? 0,
          insuranceAmount: v.insuranceAmount ?? 0,
          hasInsurance: v.hasInsurance ?? false,
          depotId: v.depotId,
          supplierId: v.supplierId,
          createdById: ctx.userId!,
          notes: v.notes ?? null,
          internalNotes: v.internalNotes ?? null,
        },
      });

      for (const item of v.lineItems) {
        const accessoryItem = await tx.accessoryItem.findFirst({
          where: { id: item.itemId, deletedAt: null, isActive: true },
        });
        if (!accessoryItem) {
          throw new AppError(
            "error.accessory_order.item_not_found",
            StatusCodes.NOT_FOUND
          );
        }

        const lineTotal = new Prisma.Decimal(item.quantity).mul(
          new Prisma.Decimal(item.unitPrice)
        );

        await tx.accessoryPurchaseOrderItem.create({
          data: {
            orderId: created.id,
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal,
            isHighPriority: item.isHighPriority ?? false,
          },
        });
      }

      await CalculateOrderTotals.accessoryPurchaseOrder(created, tx);

      const approval = await tx.approval.create({
        data: {
          entityType: ApprovalEntityType.ACCESSORY_ORDER,
          refTable: "accessory_purchase_orders",
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

      return tx.accessoryPurchaseOrder.findUniqueOrThrow({
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
      "Accessory Purchase Order Pending Your Approval",
      "Bon de commande d'accessoires en attente de votre approbation",
      `Accessory purchase order ${order.reference} has been created and requires your approval.`,
      `Le bon de commande d'accessoires ${order.reference} a été créé et nécessite votre approbation.`
    );

    this.notifyRole(
      ceoRole.id,
      order,
      NotificationType.ORDER_CREATED,
      NotificationPriority.NORMAL,
      "New Accessory Purchase Order Created",
      "Nouveau bon de commande d'accessoires créé",
      `Accessory purchase order ${order.reference} has been created and is pending accounting approval.`,
      `Le bon de commande d'accessoires ${order.reference} a été créé et est en attente d'approbation comptable.`
    );

    return order;
  }

  async update(
    id: string,
    data: UpdateAccessoryPurchaseOrderInput,
    ctx: ServiceContext
  ): Promise<AccessoryPurchaseOrder> {
    const result = updateAccessoryPurchaseOrderSchema.safeParse(data);
    if (!result.success) {
      const messages = result.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new AppError(messages, StatusCodes.BAD_REQUEST);
    }
    const v = result.data;

    const order = await prisma.accessoryPurchaseOrder.findFirst({
      where: { id, deletedAt: null },
    });
    if (!order) {
      throw new AppError(
        "error.accessory_order.not_found",
        StatusCodes.NOT_FOUND
      );
    }

    await this.assertEditable(id);

    const depot = await prisma.exploitationDepot.findFirst({
      where: { id: v.depotId, deletedAt: null, isActive: true },
    });
    if (!depot) {
      throw new AppError(
        "error.accessory_order.depot_not_found",
        StatusCodes.NOT_FOUND
      );
    }

    const supplier = await prisma.supplier.findFirst({
      where: { id: v.supplierId, deletedAt: null, isActive: true },
    });
    if (!supplier) {
      throw new AppError(
        "error.accessory_order.supplier_not_found",
        StatusCodes.NOT_FOUND
      );
    }
    if (supplier.type !== "ACCESSORIES" && supplier.type !== "MULTIPLE") {
      throw new AppError(
        "error.accessory_order.supplier_not_accessory_type",
        StatusCodes.BAD_REQUEST
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.accessoryPurchaseOrder.update({
        where: { id },
        data: {
          depotId: v.depotId,
          supplierId: v.supplierId,
          currency: v.currency || order.currency,
          vatPct: v.vatPct,
          transportMode: v.transportMode,
          estimatedTransitDays:
            v.estimatedTransitDays ?? order.estimatedTransitDays,
          estimatedArrivalDate: v.estimatedArrivalDate ?? null,
          preferredCarrier: v.preferredCarrier ?? null,
          logisticsNotes: v.logisticsNotes ?? null,
          freightFees: v.freightFees ?? order.freightFees,
          customsDuties: v.customsDuties ?? order.customsDuties,
          insuranceAmount: v.insuranceAmount ?? order.insuranceAmount,
          hasInsurance: v.hasInsurance ?? order.hasInsurance,
          notes: v.notes ?? null,
          internalNotes: v.internalNotes ?? null,
        },
      });

      await tx.accessoryPurchaseOrderItem.deleteMany({
        where: { orderId: id },
      });

      for (const item of v.lineItems) {
        const accessoryItem = await tx.accessoryItem.findFirst({
          where: { id: item.itemId, deletedAt: null, isActive: true },
        });
        if (!accessoryItem) {
          throw new AppError(
            "error.accessory_order.item_not_found",
            StatusCodes.NOT_FOUND
          );
        }

        const lineTotal = new Prisma.Decimal(item.quantity).mul(
          new Prisma.Decimal(item.unitPrice)
        );

        await tx.accessoryPurchaseOrderItem.create({
          data: {
            orderId: id,
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal,
            isHighPriority: item.isHighPriority ?? false,
          },
        });
      }

      const refreshedOrder = await tx.accessoryPurchaseOrder.findUniqueOrThrow({
        where: { id },
      });
      await CalculateOrderTotals.accessoryPurchaseOrder(refreshedOrder, tx);

      return tx.accessoryPurchaseOrder.findUniqueOrThrow({
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
          "transportMode",
          "estimatedTransitDays",
          "freightFees",
          "customsDuties",
          "insuranceAmount",
          "hasInsurance",
          "lineItems",
          "subTotal",
          "vatAmount",
          "totalEstimate",
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
  ): Promise<AccessoryPurchaseOrder> {
    const order = await prisma.accessoryPurchaseOrder.findFirst({
      where: { id, deletedAt: null },
    });
    if (!order) {
      throw new AppError(
        "error.accessory_order.not_found",
        StatusCodes.NOT_FOUND
      );
    }

    if (
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.IN_TRANSIT
    ) {
      throw new AppError(
        "error.accessory_order.cannot_delete_active_order",
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
  ): Promise<AccessoryPurchaseOrder> {
    const order = await prisma.accessoryPurchaseOrder.findFirst({
      where: { id, deletedAt: null },
    });
    if (!order) {
      throw new AppError(
        "error.accessory_order.not_found",
        StatusCodes.NOT_FOUND
      );
    }

    if (
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new AppError(
        "error.accessory_order.cannot_cancel_order",
        StatusCodes.BAD_REQUEST
      );
    }

    const approval = await prisma.approval.findFirst({
      where: {
        recordId: id,
        entityType: ApprovalEntityType.ACCESSORY_ORDER,
      },
      include: { steps: { orderBy: { step: "asc" } } },
    });

    if (!approval) {
      throw new AppError(
        "error.accessory_order.approval_not_found",
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
        "error.accessory_order.only_final_approver_can_cancel",
        StatusCodes.FORBIDDEN
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const cancelled = await tx.accessoryPurchaseOrder.update({
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
      titleEnglish: "Accessory Purchase Order Cancelled",
      titleFrench: "Bon de commande d'accessoires annulé",
      bodyEnglish: `Accessory purchase order ${order.reference} has been cancelled by ${user.name} ${user.surname}.`,
      bodyFrench: `Le bon de commande d'accessoires ${order.reference} a été annulé par ${user.name} ${user.surname}.`,
      refTable: "accessory_purchase_orders",
      refId: id,
      data: { orderId: id, reference: order.reference },
    }).catch((err) =>
      console.error(
        "[AccessoryPurchaseOrderService] Cancel notification failed:",
        err
      )
    );

    // Recalculate supplier metrics after cancellation
    if (order.supplierId) {
      recalculateSupplierMetrics(order.supplierId).catch((err) =>
        console.error(
          "[AccessoryPurchaseOrderService] Supplier metrics recalculation failed:",
          err
        )
      );
    }

    return updated;
  }

  async getOrderSummary(id: string, ctx: ServiceContext): Promise<any> {
    const order = await prisma.accessoryPurchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: FULL_ORDER_INCLUDE,
    });

    if (!order) {
      throw new AppError(
        "error.accessory_order.not_found",
        StatusCodes.NOT_FOUND
      );
    }

    const approval = await prisma.approval.findFirst({
      where: {
        recordId: id,
        entityType: ApprovalEntityType.ACCESSORY_ORDER,
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
        entityType: ApprovalEntityType.ACCESSORY_ORDER,
      },
      include: { steps: true },
    });

    if (approval) {
      const hasApprovedStep = approval.steps.some(
        (s) => s.status === ApprovalStatus.APPROVED
      );
      if (hasApprovedStep) {
        throw new AppError(
          "error.accessory_order.cannot_edit_approved_order",
          StatusCodes.BAD_REQUEST
        );
      }
    }
  }

  private notifyRole(
    roleId: string,
    order: AccessoryPurchaseOrder,
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
      refTable: "accessory_purchase_orders",
      refId: order.id,
      data: { orderId: order.id, reference: order.reference },
    }).catch((err) =>
      console.error(
        `[AccessoryPurchaseOrderService] Notification to role ${roleId} failed:`,
        err
      )
    );
  }
}
