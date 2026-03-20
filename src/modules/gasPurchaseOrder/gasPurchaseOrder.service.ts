import { BaseService } from "src/base/BaseService";
import { GasPurchaseOrderRepository } from "./gasPurchaseOrder.repository";
import {
  createGasPurchaseOrderSchema,
  updateGasPurchaseOrderSchema,
  assignTankersSchema,
  addLineItemsSchema,
  CreateGasPurchaseOrderInput,
  UpdateGasPurchaseOrderInput,
  AssignTankersInput,
  AddLineItemsInput,
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
import NotificationService from "@services/nofication";
import { sendAndDispatch } from "@services/nofication/notification.dispatcher";
import { sendEmail } from "@utils/sendEmail.util";

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

  // ─── Step 1: Create Draft Order ──────────────────────────────────────────────
  async createDraftOrder(
    data: CreateGasPurchaseOrderInput,
    ctx: ServiceContext
  ): Promise<GasPurchaseOrder> {
    const result = createGasPurchaseOrderSchema.safeParse(data);
    if (!result.success) {
      const messages = result.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new AppError(messages, StatusCodes.BAD_REQUEST);
    }
    const validData = result.data;

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

    const order = await prisma.$transaction(async (tx) => {
      const reference = await generateReference(tx, "GAS_PO" as any);

      const created = await tx.gasPurchaseOrder.create({
        data: {
          reference,
          status: OrderStatus.DRAFT,
          priority: validData.priority || "NORMAL",
          currency: validData.currency || "XAF",
          vatPct: financeSettings.vatPct,
          regulatoryTaxPct: financeSettings.regulatoryTax,
          depotId: validData.depotId,
          createdById: ctx.userId!,
          notes: validData.notes,
          internalNotes: validData.internalNotes,
          requestedDate: validData.requestedDate || undefined,
        },
        include: {
          depot: true,
          createdBy: {
            select: { id: true, name: true, surname: true, email: true },
          },
        },
      });

      return created;
    });

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

    // Send ORDER_CREATED notification to CEO and Accounting
    await this.notifyApprovalRoles(
      order,
      NotificationType.ORDER_CREATED,
      "New Gas Purchase Order Created",
      "Nouveau bon de commande de gaz créé",
      `Gas purchase order ${order.reference} has been created and is in DRAFT status.`,
      `Le bon de commande de gaz ${order.reference} a été créé et est au statut BROUILLON.`
    );

    return order;
  }

  // ─── Step 2: Assign Tankers ────────────────────────────────────────────────
  async assignTankers(
    orderId: string,
    data: AssignTankersInput,
    ctx: ServiceContext
  ): Promise<GasPurchaseOrder> {
    const result = assignTankersSchema.safeParse(data);
    if (!result.success) {
      const messages = result.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new AppError(messages, StatusCodes.BAD_REQUEST);
    }
    const validData = result.data;

    const order = await prisma.gasPurchaseOrder.findFirst({
      where: { id: orderId, deletedAt: null },
    });
    if (!order) {
      throw new AppError(
        "error.gas_order.not_found",
        StatusCodes.NOT_FOUND
      );
    }

    if (order.status !== OrderStatus.DRAFT) {
      throw new AppError(
        "error.gas_order.must_be_draft_to_assign_tankers",
        StatusCodes.BAD_REQUEST
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Remove existing tanker assignments for this order
      await tx.gasPurchaseOrderTanker.deleteMany({
        where: { orderId },
      });

      for (const tankerInput of validData.tankers) {
        // Validate tanker exists and is AVAILABLE
        const tanker = await tx.tanker.findFirst({
          where: {
            id: tankerInput.tankerId,
            deletedAt: null,
          },
          include: { driver: true },
        });

        if (!tanker) {
          throw new AppError(
            "error.gas_order.tanker_not_found",
            StatusCodes.NOT_FOUND
          );
        }

        if (tanker.status !== TankerStatus.AVAILABLE && tanker.status !== TankerStatus.IDLE) {
          throw new AppError(
            "error.gas_order.tanker_not_available",
            StatusCodes.BAD_REQUEST
          );
        }

        // Validate driver is certified
        if (!tanker.driver.isCertified) {
          throw new AppError(
            "error.gas_order.driver_not_certified",
            StatusCodes.BAD_REQUEST
          );
        }

        await tx.gasPurchaseOrderTanker.create({
          data: {
            orderId,
            tankerId: tankerInput.tankerId,
            driverId: tanker.driverId,
            collectionDate: tankerInput.collectionDate || undefined,
          },
        });
      }

      return tx.gasPurchaseOrder.findUnique({
        where: { id: orderId },
        include: {
          tankers: {
            include: {
              tanker: true,
              driver: { include: { user: { select: { name: true, surname: true } } } },
            },
          },
          depot: true,
          createdBy: {
            select: { id: true, name: true, surname: true, email: true },
          },
        },
      });
    });

    if (ctx.req) {
      logUserActivity(ctx.req, {
        operation: LogOperation.UPDATE,
        category: LogCategory.WRITE,
        tableName: this.tableName,
        recordId: orderId,
        newState: updated as any,
        changedFields: ["tankers"],
        userId: ctx.userId,
        userEmail: ctx.userEmail || "system",
        requestId: ctx.requestId,
      });
    }

    return updated!;
  }

  // ─── Step 3: Add Line Items + Supplier ─────────────────────────────────────
  async addLineItems(
    orderId: string,
    data: AddLineItemsInput,
    ctx: ServiceContext
  ): Promise<GasPurchaseOrder> {
    const result = addLineItemsSchema.safeParse(data);
    if (!result.success) {
      const messages = result.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new AppError(messages, StatusCodes.BAD_REQUEST);
    }
    const validData = result.data;

    const order = await prisma.gasPurchaseOrder.findFirst({
      where: { id: orderId, deletedAt: null },
    });
    if (!order) {
      throw new AppError(
        "error.gas_order.not_found",
        StatusCodes.NOT_FOUND
      );
    }

    if (order.status !== OrderStatus.DRAFT) {
      throw new AppError(
        "error.gas_order.must_be_draft_to_add_items",
        StatusCodes.BAD_REQUEST
      );
    }

    // Validate supplier exists and is a GAS supplier
    const supplier = await prisma.supplier.findFirst({
      where: {
        id: validData.supplierId,
        deletedAt: null,
      },
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

    const updated = await prisma.$transaction(async (tx) => {
      // Remove existing line items
      await tx.gasPurchaseOrderItem.deleteMany({
        where: { orderId },
      });

      // Update supplier and collection date on order
      await tx.gasPurchaseOrder.update({
        where: { id: orderId },
        data: {
          supplierId: validData.supplierId,
          collectionDate: validData.collectionDate || undefined,
        },
      });

      // Create line items
      for (const item of validData.lineItems) {
        const lineTotal = new Prisma.Decimal(item.quantity).mul(
          new Prisma.Decimal(item.unitPrice)
        );

        await tx.gasPurchaseOrderItem.create({
          data: {
            orderId,
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

      // Recalculate order totals
      const refreshedOrder = await tx.gasPurchaseOrder.findUnique({
        where: { id: orderId },
      });
      await CalculateOrderTotals.gasPurchaseOrder(refreshedOrder!, tx);

      return tx.gasPurchaseOrder.findUnique({
        where: { id: orderId },
        include: {
          lineItems: true,
          tankers: {
            include: {
              tanker: true,
              driver: { include: { user: { select: { name: true, surname: true } } } },
            },
          },
          supplier: true,
          depot: true,
          createdBy: {
            select: { id: true, name: true, surname: true, email: true },
          },
        },
      });
    });

    if (ctx.req) {
      logUserActivity(ctx.req, {
        operation: LogOperation.UPDATE,
        category: LogCategory.WRITE,
        tableName: this.tableName,
        recordId: orderId,
        newState: updated as any,
        changedFields: ["supplierId", "lineItems", "subTotal", "vatAmount", "regulatoryTaxAmt", "total", "totalInCfa"],
        userId: ctx.userId,
        userEmail: ctx.userEmail || "system",
        requestId: ctx.requestId,
      });
    }

    return updated!;
  }

  // ─── Step 4: Get Full Order Summary ────────────────────────────────────────
  async getOrderSummary(
    orderId: string,
    ctx: ServiceContext
  ): Promise<GasPurchaseOrder> {
    const order = await prisma.gasPurchaseOrder.findFirst({
      where: { id: orderId, deletedAt: null },
      include: {
        lineItems: true,
        tankers: {
          include: {
            tanker: true,
            driver: {
              include: {
                user: { select: { id: true, name: true, surname: true, email: true } },
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

    return order;
  }

  // ─── Submit for Approval ───────────────────────────────────────────────────
  async submitForApproval(
    orderId: string,
    ctx: ServiceContext
  ): Promise<GasPurchaseOrder> {
    const order = await prisma.gasPurchaseOrder.findFirst({
      where: { id: orderId, deletedAt: null },
      include: {
        lineItems: true,
        tankers: true,
        supplier: true,
      },
    });

    if (!order) {
      throw new AppError(
        "error.gas_order.not_found",
        StatusCodes.NOT_FOUND
      );
    }

    if (order.status !== OrderStatus.DRAFT) {
      throw new AppError(
        "error.gas_order.must_be_draft_to_submit",
        StatusCodes.BAD_REQUEST
      );
    }

    // Validate all required fields are filled
    if (!order.supplierId) {
      throw new AppError(
        "error.gas_order.supplier_required_for_submission",
        StatusCodes.BAD_REQUEST
      );
    }
    if (!order.lineItems || order.lineItems.length === 0) {
      throw new AppError(
        "error.gas_order.line_items_required_for_submission",
        StatusCodes.BAD_REQUEST
      );
    }
    if (!order.tankers || order.tankers.length === 0) {
      throw new AppError(
        "error.gas_order.tankers_required_for_submission",
        StatusCodes.BAD_REQUEST
      );
    }

    // Find CEO role
    const ceoRole = await prisma.role.findFirst({
      where: { name: "Directeur Général (CEO)" },
    });
    if (!ceoRole) {
      throw new AppError(
        "error.gas_order.ceo_role_not_found",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // Find Accountant role
    const accountantRole = await prisma.role.findFirst({
      where: { name: "Comptable (Accountant)" },
    });
    if (!accountantRole) {
      throw new AppError(
        "error.gas_order.accountant_role_not_found",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // Verify users with these roles exist
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

    const updated = await prisma.$transaction(async (tx) => {
      // Update order status
      const updatedOrder = await tx.gasPurchaseOrder.update({
        where: { id: orderId },
        data: { status: OrderStatus.PENDING_APPROVAL },
      });

      // Create Approval record
      const approval = await tx.approval.create({
        data: {
          entityType: ApprovalEntityType.GAS_ORDER,
          refTable: "gas_purchase_orders",
          recordId: orderId,
          status: ApprovalStatus.PENDING,
          currentStep: 1,
          totalSteps: 2,
          requestedById: ctx.userId!,
        },
      });

      // Step 1: CEO approval
      await tx.approvalStep.create({
        data: {
          approvalId: approval.id,
          step: 1,
          role: ApprovalRole.CEO,
          status: ApprovalStatus.PENDING,
        },
      });

      // Step 2: Accounting approval
      await tx.approvalStep.create({
        data: {
          approvalId: approval.id,
          step: 2,
          role: ApprovalRole.ACCOUNTING,
          status: ApprovalStatus.PENDING,
        },
      });

      return updatedOrder;
    });

    // Log activity
    if (ctx.req) {
      logUserActivity(ctx.req, {
        operation: LogOperation.UPDATE,
        category: LogCategory.WRITE,
        tableName: this.tableName,
        recordId: orderId,
        previousState: order as any,
        newState: updated as any,
        changedFields: ["status"],
        userId: ctx.userId,
        userEmail: ctx.userEmail || "system",
        requestId: ctx.requestId,
      });
    }

    // Send ORDER_SUBMITTED notification to CEO users via WebSocket
    for (const ceo of ceoUsers) {
      await sendAndDispatch({
        type: NotificationType.ORDER_SUBMITTED,
        priority: NotificationPriority.HIGH,
        target: { type: "user", userId: ceo.id },
        titleEnglish: "Gas Purchase Order Pending Approval",
        titleFrench: "Bon de commande de gaz en attente d'approbation",
        bodyEnglish: `Gas purchase order ${order.reference} has been submitted for your approval.`,
        bodyFrench: `Le bon de commande de gaz ${order.reference} a été soumis pour votre approbation.`,
        refTable: "gas_purchase_orders",
        refId: orderId,
        data: { orderId, reference: order.reference },
      });
    }

    return updated;
  }

  // ─── Approve / Reject Order ────────────────────────────────────────────────
  async approveOrReject(
    orderId: string,
    action: "APPROVED" | "REJECTED",
    notes: string | undefined,
    ctx: ServiceContext
  ): Promise<GasPurchaseOrder> {
    const order = await prisma.gasPurchaseOrder.findFirst({
      where: { id: orderId, deletedAt: null },
      include: { createdBy: { select: { id: true, email: true, name: true, surname: true } } },
    });

    if (!order) {
      throw new AppError(
        "error.gas_order.not_found",
        StatusCodes.NOT_FOUND
      );
    }

    if (order.status !== OrderStatus.PENDING_APPROVAL) {
      throw new AppError(
        "error.gas_order.not_pending_approval",
        StatusCodes.BAD_REQUEST
      );
    }

    // Get the user's role
    const currentUser = await prisma.user.findUnique({
      where: { id: ctx.userId! },
      include: { role: true },
    });

    if (!currentUser) {
      throw new AppError(
        "error.auth.user_not_found",
        StatusCodes.UNAUTHORIZED
      );
    }

    // Find the active approval
    const approval = await prisma.approval.findFirst({
      where: {
        recordId: orderId,
        entityType: ApprovalEntityType.GAS_ORDER,
        status: ApprovalStatus.PENDING,
      },
      include: { steps: { orderBy: { step: "asc" } } },
    });

    if (!approval) {
      throw new AppError(
        "error.gas_order.approval_not_found",
        StatusCodes.NOT_FOUND
      );
    }

    // Determine which role the user has
    const isCeo = currentUser.role.name === "Directeur Général (CEO)";
    const isAccountant = currentUser.role.name === "Comptable (Accountant)";

    // Find the current pending step that matches the user's role
    const currentStep = approval.steps.find(
      (s) =>
        s.status === ApprovalStatus.PENDING &&
        ((s.role === ApprovalRole.CEO && isCeo) ||
          (s.role === ApprovalRole.ACCOUNTING && isAccountant))
    );

    if (!currentStep) {
      throw new AppError(
        "error.gas_order.not_authorized_to_approve",
        StatusCodes.FORBIDDEN
      );
    }

    // For CEO step (step 1), it must be current step
    if (currentStep.step !== approval.currentStep) {
      throw new AppError(
        "error.gas_order.not_your_turn_to_approve",
        StatusCodes.BAD_REQUEST
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Update the approval step
      await tx.approvalStep.update({
        where: { id: currentStep.id },
        data: {
          status: action === "APPROVED" ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
          decidedAt: new Date(),
          decidedById: ctx.userId!,
          notes,
        },
      });

      if (action === "REJECTED") {
        // Rejection: reset order to DRAFT, mark approval as REJECTED
        await tx.approval.update({
          where: { id: approval.id },
          data: {
            status: ApprovalStatus.REJECTED,
            completedAt: new Date(),
          },
        });

        return tx.gasPurchaseOrder.update({
          where: { id: orderId },
          data: { status: OrderStatus.DRAFT },
        });
      }

      // Approval: check if more steps remain
      if (currentStep.step < approval.totalSteps) {
        // Move to next step
        await tx.approval.update({
          where: { id: approval.id },
          data: { currentStep: currentStep.step + 1 },
        });

        return tx.gasPurchaseOrder.findUnique({
          where: { id: orderId },
        });
      } else {
        // All steps approved — finalize
        await tx.approval.update({
          where: { id: approval.id },
          data: {
            status: ApprovalStatus.APPROVED,
            completedAt: new Date(),
          },
        });

        return tx.gasPurchaseOrder.update({
          where: { id: orderId },
          data: { status: OrderStatus.APPROVED },
        });
      }
    });

    // Log activity
    if (ctx.req) {
      logUserActivity(ctx.req, {
        operation: LogOperation.UPDATE,
        category: LogCategory.WRITE,
        tableName: this.tableName,
        recordId: orderId,
        previousState: order as any,
        newState: updated as any,
        changedFields: ["status"],
        userId: ctx.userId,
        userEmail: ctx.userEmail || "system",
        requestId: ctx.requestId,
      });
    }

    // Send notifications
    const notificationType =
      action === "APPROVED"
        ? NotificationType.APPROVAL_APPROVED
        : NotificationType.APPROVAL_REJECTED;

    // Notify order creator
    await sendAndDispatch({
      type: notificationType,
      priority: NotificationPriority.HIGH,
      target: { type: "user", userId: order.createdById },
      titleEnglish: `Gas Purchase Order ${action === "APPROVED" ? "Approved" : "Rejected"}`,
      titleFrench: `Bon de commande de gaz ${action === "APPROVED" ? "approuvé" : "rejeté"}`,
      bodyEnglish: `Gas purchase order ${order.reference} has been ${action.toLowerCase()} by ${currentUser.name} ${currentUser.surname}.`,
      bodyFrench: `Le bon de commande de gaz ${order.reference} a été ${action === "APPROVED" ? "approuvé" : "rejeté"} par ${currentUser.name} ${currentUser.surname}.`,
      refTable: "gas_purchase_orders",
      refId: orderId,
      data: { orderId, reference: order.reference, action },
    });

    // If CEO approved and next step is Accounting, notify accountants
    if (action === "APPROVED" && currentStep.step < approval.totalSteps) {
      const accountantRole = await prisma.role.findFirst({
        where: { name: "Comptable (Accountant)" },
      });
      if (accountantRole) {
        await sendAndDispatch({
          type: NotificationType.APPROVAL_REQUIRED,
          priority: NotificationPriority.HIGH,
          target: { type: "role", roleId: accountantRole.id },
          titleEnglish: "Gas Purchase Order Pending Your Approval",
          titleFrench: "Bon de commande de gaz en attente de votre approbation",
          bodyEnglish: `Gas purchase order ${order.reference} has been approved by CEO and now requires your approval.`,
          bodyFrench: `Le bon de commande de gaz ${order.reference} a été approuvé par le DG et nécessite maintenant votre approbation.`,
          refTable: "gas_purchase_orders",
          refId: orderId,
          data: { orderId, reference: order.reference },
        });
      }
    }

    // Send email for approval/rejection
    try {
      const creator = order.createdBy;
      const subject =
        action === "APPROVED"
          ? `Order ${order.reference} Approved`
          : `Order ${order.reference} Rejected`;
      const html =
        action === "APPROVED"
          ? `<p>Your gas purchase order <strong>${order.reference}</strong> has been ${currentStep.step < approval.totalSteps ? "approved by CEO. Awaiting accounting approval." : "fully approved."}</p>`
          : `<p>Your gas purchase order <strong>${order.reference}</strong> has been rejected by ${currentUser.name} ${currentUser.surname}.${notes ? ` Reason: ${notes}` : ""} The order has been returned to DRAFT status for revision.</p>`;

      await sendEmail(creator.email, subject, "", html);
    } catch (emailError) {
      console.error("[GasPurchaseOrderService] Failed to send email:", emailError);
    }

    return updated!;
  }

  // ─── Override delete for soft delete ───────────────────────────────────────
  async delete(
    id: string,
    ctx: ServiceContext,
    soft: boolean = true
  ): Promise<GasPurchaseOrder> {
    const order = await prisma.gasPurchaseOrder.findFirst({
      where: { id, deletedAt: null },
    });

    if (!order) {
      throw new AppError(
        "error.gas_order.not_found",
        StatusCodes.NOT_FOUND
      );
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

    if (soft) {
      return this.repository.softDelete(id, ["reference"]);
    }
    return this.repository.delete(id);
  }

  // ─── Helper: Notify CEO and Accounting roles ──────────────────────────────
  private async notifyApprovalRoles(
    order: GasPurchaseOrder,
    type: NotificationType,
    titleEn: string,
    titleFr: string,
    bodyEn: string,
    bodyFr: string
  ): Promise<void> {
    const ceoRole = await prisma.role.findFirst({
      where: { name: "Directeur Général (CEO)" },
    });
    const accountantRole = await prisma.role.findFirst({
      where: { name: "Comptable (Accountant)" },
    });

    const roleIds = [ceoRole?.id, accountantRole?.id].filter(Boolean) as string[];

    for (const roleId of roleIds) {
      try {
        await sendAndDispatch({
          type,
          priority: NotificationPriority.NORMAL,
          target: { type: "role", roleId },
          titleEnglish: titleEn,
          titleFrench: titleFr,
          bodyEnglish: bodyEn,
          bodyFrench: bodyFr,
          refTable: "gas_purchase_orders",
          refId: order.id,
          data: { orderId: order.id, reference: order.reference },
        });
      } catch (err) {
        console.error(`[GasPurchaseOrderService] Failed to notify role ${roleId}:`, err);
      }
    }
  }
}
