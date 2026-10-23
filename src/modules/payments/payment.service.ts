import { BaseService } from "src/base/BaseService";
import { PaymentRepository } from "./payment.repository";
import {
  recordPaymentSchema,
  RecordPaymentInput,
  reversePaymentSchema,
  ReversePaymentInput,
  correctPaymentSchema,
  CorrectPaymentInput,
  updatePaymentNotesSchema,
  UpdatePaymentNotesInput,
} from "./payment.schema";

import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import {
  PaymentRecord,
  OrderStatus,
  PaymentStatus,
  ExploitationInvoiceStatus,
  ExploitationInvoiceType,
  ApprovalEntityType,
  ApprovalStatus,
  ApprovalRole,
  NotificationType,
  NotificationPriority,
  Prisma,
} from "src/generated/prisma";
import prisma from "@models/index.model";
import { logUserActivity } from "@utils/logUserActivity.util";
import { LogCategory, LogOperation } from "@appTypes/log.type";
import { sendAndDispatch } from "@services/notification/notification.dispatcher";
import generateReference from "@utils/generateOrderReference.util";
import { recalculateSupplierMetrics } from "@utils/recalculateSupplierMetrics.util";

const PAYMENT_INCLUDE = {
  invoice: true,
  paidBy: {
    select: { id: true, name: true, surname: true, email: true },
  },
  recipientUser: {
    select: { id: true, name: true, surname: true, email: true },
  },
  recipientSupplier: {
    select: { id: true, name: true, code: true },
  },
  reverses: {
    select: { id: true, amount: true, paidAt: true },
  },
  reversedBy: {
    select: { id: true, amount: true, paidAt: true },
  },
} as const;

interface OrderTypeConfig {
  modelName: string;
  refTable: string;
  invoiceType: ExploitationInvoiceType;
  approvalEntityType: ApprovalEntityType;
  invoiceRefPrefix: string;
}

const ORDER_TYPE_CONFIGS: Record<string, OrderTypeConfig> = {
  gas_purchase_orders: {
    modelName: "gasPurchaseOrder",
    refTable: "gas_purchase_orders",
    invoiceType: ExploitationInvoiceType.GAS,
    approvalEntityType: ApprovalEntityType.GAS_ORDER,
    invoiceRefPrefix: "GAS_INVOICE",
  },
  gas_bottle_purchase_orders: {
    modelName: "gasBottlePurchaseOrder",
    refTable: "gas_bottle_purchase_orders",
    invoiceType: ExploitationInvoiceType.GAS_BOTTLE,
    approvalEntityType: ApprovalEntityType.GAS_BOTTLE_ORDER,
    invoiceRefPrefix: "GAS_BOTTLE_INVOICE",
  },
  accessory_purchase_orders: {
    modelName: "accessoryPurchaseOrder",
    refTable: "accessory_purchase_orders",
    invoiceType: ExploitationInvoiceType.ACCESSORY,
    approvalEntityType: ApprovalEntityType.ACCESSORY_ORDER,
    invoiceRefPrefix: "ACCESSORY_INVOICE",
  },
};

function getOrderTypeConfig(refTable: string): OrderTypeConfig {
  const config = ORDER_TYPE_CONFIGS[refTable];
  if (!config) {
    throw new AppError(
      "error.payment.unsupported_order_type",
      StatusCodes.BAD_REQUEST
    );
  }
  return config;
}

export class PaymentService extends BaseService<PaymentRecord> {
  protected repository: PaymentRepository;
  protected tableName = "payment_records";

  constructor() {
    super();
    this.repository = new PaymentRepository();
  }

  private async findOrder(
    config: OrderTypeConfig,
    orderId: string
  ): Promise<any> {
    const order = await (prisma as any)[config.modelName].findFirst({
      where: { id: orderId, deletedAt: null },
    });
    if (!order) {
      throw new AppError(
        "error.payment.order_not_found",
        StatusCodes.NOT_FOUND
      );
    }
    return order;
  }

  async recordPayment(
    data: RecordPaymentInput,
    ctx: ServiceContext
  ): Promise<PaymentRecord> {
    const result = recordPaymentSchema.safeParse(data);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message)[0];
      throw new AppError(messages, StatusCodes.BAD_REQUEST);
    }
    const v = result.data;

    const config = getOrderTypeConfig(v.refTable);
    const order = await this.findOrder(config, v.orderId);

    if (
      order.status !== OrderStatus.APPROVED &&
      order.status !== OrderStatus.FINALIZED
    ) {
      throw new AppError(
        "error.payment.order_not_approved",
        StatusCodes.BAD_REQUEST
      );
    }

    const approval = await prisma.approval.findFirst({
      where: {
        recordId: v.orderId,
        entityType: config.approvalEntityType,
      },
      include: { steps: { orderBy: { step: "asc" } } },
    });

    if (!approval || approval.status !== ApprovalStatus.APPROVED) {
      throw new AppError(
        "error.payment.approval_not_complete",
        StatusCodes.BAD_REQUEST
      );
    }

    const accountingStep = approval.steps.find(
      (s) => s.role === ApprovalRole.ACCOUNTING
    );
    if (accountingStep) {
      const priorSteps = approval.steps.filter(
        (s) => s.step < accountingStep.step
      );
      const allPriorApproved = priorSteps.every(
        (s) => s.status === ApprovalStatus.APPROVED
      );
      if (!allPriorApproved) {
        throw new AppError(
          "error.payment.prior_approval_steps_not_complete",
          StatusCodes.BAD_REQUEST
        );
      }
    }

    if (v.recipientSupplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: v.recipientSupplierId, deletedAt: null },
      });
      if (!supplier) {
        throw new AppError(
          "error.payment.recipient_supplier_not_found",
          StatusCodes.NOT_FOUND
        );
      }
    }
    if (v.recipientUserId) {
      const user = await prisma.user.findFirst({
        where: { id: v.recipientUserId, deletedAt: null },
      });
      if (!user) {
        throw new AppError(
          "error.payment.recipient_user_not_found",
          StatusCodes.NOT_FOUND
        );
      }
    }

    const payment = await prisma.$transaction(async (tx) => {
      let invoice = await tx.exploitationInvoice.findFirst({
        where: {
          orderId: v.orderId,
          type: config.invoiceType,
          deletedAt: null,
        },
      });

      if (!invoice) {
        const invoiceNumber = await generateReference(
          tx,
          config.invoiceRefPrefix as any
        );

        invoice = await tx.exploitationInvoice.create({
          data: {
            type: config.invoiceType,
            refTable: config.refTable,
            orderId: v.orderId,
            invoiceNumber,
            invoiceDate: new Date(),
            currency: order.currency,
            vatPct: order.vatPct,
            vatAmount: order.vatAmount,
            subTotal: order.subTotal,
            total: order.total ?? new Prisma.Decimal(0),
            totalInCfa: order.totalInCfa,
            status: ExploitationInvoiceStatus.UNPAID,
            amountPaid: new Prisma.Decimal(0),
            createdById: ctx.userId!,
          },
        });
      }

      const paymentRecord = await tx.paymentRecord.create({
        data: {
          invoiceId: invoice.id,
          refTable: config.refTable,
          orderId: v.orderId,
          paidById: ctx.userId!,
          recipientType: v.recipientType,
          recipientName: v.recipientName,
          recipientSupplierId: v.recipientSupplierId ?? null,
          recipientUserId: v.recipientUserId ?? null,
          method: v.method,
          bankName: v.bankName ?? null,
          transactionReference: v.transactionReference ?? null,
          mobileMoneyProvider: v.mobileMoneyProvider ?? null,
          checkNumber: v.checkNumber ?? null,
          currency: v.currency,
          amount: v.amount,
          amountInCfa: v.amountInCfa,
          paidAt: v.paidAt,
          isReversal: false,
          purpose: v.purpose ?? null,
          notes: v.notes ?? null,
        },
      });

      await this.recalculateInvoiceAndOrder(tx, invoice.id, v.orderId, config);

      return tx.paymentRecord.findUniqueOrThrow({
        where: { id: paymentRecord.id },
        include: PAYMENT_INCLUDE,
      });
    });

    if (ctx.req) {
      logUserActivity(ctx.req, {
        operation: LogOperation.CREATE,
        category: LogCategory.WRITE,
        tableName: this.tableName,
        recordId: payment.id,
        newState: this.serializeForLog(payment),
        userId: ctx.userId,
        userEmail: ctx.userEmail || "system",
        requestId: ctx.requestId,
      });
    }

    this.notifyOrderCreator(
      order.createdById,
      order.id,
      order.reference,
      config.refTable,
      NotificationType.PAYMENT_RECEIVED,
      "Payment Recorded",
      "Paiement enregistré",
      `A payment of ${v.amount} ${v.currency} has been recorded for order ${order.reference}.`,
      `Un paiement de ${v.amount} ${v.currency} a été enregistré pour la commande ${order.reference}.`
    );

    return payment;
  }

  async reversePayment(
    paymentId: string,
    data: ReversePaymentInput,
    ctx: ServiceContext
  ): Promise<PaymentRecord> {
    const result = reversePaymentSchema.safeParse(data);
    if (!result.success) {
      const messages = result.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new AppError(messages, StatusCodes.BAD_REQUEST);
    }
    const v = result.data;

    const original = await prisma.paymentRecord.findUnique({
      where: { id: paymentId },
    });
    if (!original) {
      throw new AppError("error.payment.not_found", StatusCodes.NOT_FOUND);
    }
    if (original.isReversal) {
      throw new AppError(
        "error.payment.cannot_reverse_a_reversal",
        StatusCodes.BAD_REQUEST
      );
    }

    const existingReversal = await prisma.paymentRecord.findFirst({
      where: { reversesId: paymentId },
    });
    if (existingReversal) {
      throw new AppError(
        "error.payment.already_reversed",
        StatusCodes.BAD_REQUEST
      );
    }

    const config = getOrderTypeConfig(original.refTable);

    const reversal = await prisma.$transaction(async (tx) => {
      const reversalRecord = await tx.paymentRecord.create({
        data: {
          invoiceId: original.invoiceId,
          refTable: original.refTable,
          orderId: original.orderId,
          paidById: ctx.userId!,
          recipientType: original.recipientType,
          recipientName: original.recipientName,
          recipientSupplierId: original.recipientSupplierId,
          recipientUserId: original.recipientUserId,
          method: original.method,
          bankName: original.bankName,
          transactionReference: original.transactionReference,
          mobileMoneyProvider: original.mobileMoneyProvider,
          checkNumber: original.checkNumber,
          currency: original.currency,
          amount: new Prisma.Decimal(original.amount).negated(),
          amountInCfa: new Prisma.Decimal(original.amountInCfa).negated(),
          paidAt: new Date(),
          isReversal: true,
          reversesId: original.id,
          purpose: `Reversal of payment ${paymentId}`,
          notes: v.notes ?? null,
        },
      });

      await this.recalculateInvoiceAndOrder(
        tx,
        original.invoiceId,
        original.orderId,
        config
      );

      return tx.paymentRecord.findUniqueOrThrow({
        where: { id: reversalRecord.id },
        include: PAYMENT_INCLUDE,
      });
    });

    if (ctx.req) {
      logUserActivity(ctx.req, {
        operation: LogOperation.CREATE,
        category: LogCategory.WRITE,
        tableName: this.tableName,
        recordId: reversal.id,
        previousState: this.serializeForLog(original),
        newState: this.serializeForLog(reversal),
        changedFields: ["isReversal", "amount", "amountInCfa"],
        userId: ctx.userId,
        userEmail: ctx.userEmail || "system",
        requestId: ctx.requestId,
      });
    }

    const order = await (prisma as any)[config.modelName].findUnique({
      where: { id: original.orderId },
    });
    if (order) {
      this.notifyOrderCreator(
        order.createdById,
        order.id,
        order.reference,
        config.refTable,
        NotificationType.PAYMENT_RECEIVED,
        "Payment Reversed",
        "Paiement annulé",
        `A payment of ${original.amount} ${original.currency} has been reversed for order ${order.reference}.`,
        `Un paiement de ${original.amount} ${original.currency} a été annulé pour la commande ${order.reference}.`
      );
    }

    return reversal;
  }

  async correctPayment(
    paymentId: string,
    data: CorrectPaymentInput,
    ctx: ServiceContext
  ): Promise<{ reversal: PaymentRecord; corrected: PaymentRecord }> {
    const result = correctPaymentSchema.safeParse(data);
    if (!result.success) {
      const messages = result.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new AppError(messages, StatusCodes.BAD_REQUEST);
    }
    const v = result.data;

    const original = await prisma.paymentRecord.findUnique({
      where: { id: paymentId },
    });
    if (!original) {
      throw new AppError("error.payment.not_found", StatusCodes.NOT_FOUND);
    }
    if (original.isReversal) {
      throw new AppError(
        "error.payment.cannot_reverse_a_reversal",
        StatusCodes.BAD_REQUEST
      );
    }

    const existingReversal = await prisma.paymentRecord.findFirst({
      where: { reversesId: paymentId },
    });
    if (existingReversal) {
      throw new AppError(
        "error.payment.already_reversed",
        StatusCodes.BAD_REQUEST
      );
    }

    if (v.recipientSupplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: v.recipientSupplierId, deletedAt: null },
      });
      if (!supplier) {
        throw new AppError(
          "error.payment.recipient_supplier_not_found",
          StatusCodes.NOT_FOUND
        );
      }
    }
    if (v.recipientUserId) {
      const user = await prisma.user.findFirst({
        where: { id: v.recipientUserId, deletedAt: null },
      });
      if (!user) {
        throw new AppError(
          "error.payment.recipient_user_not_found",
          StatusCodes.NOT_FOUND
        );
      }
    }

    const config = getOrderTypeConfig(original.refTable);

    const { reversal, corrected } = await prisma.$transaction(async (tx) => {
      const reversalRecord = await tx.paymentRecord.create({
        data: {
          invoiceId: original.invoiceId,
          refTable: original.refTable,
          orderId: original.orderId,
          paidById: ctx.userId!,
          recipientType: original.recipientType,
          recipientName: original.recipientName,
          recipientSupplierId: original.recipientSupplierId,
          recipientUserId: original.recipientUserId,
          method: original.method,
          bankName: original.bankName,
          transactionReference: original.transactionReference,
          mobileMoneyProvider: original.mobileMoneyProvider,
          checkNumber: original.checkNumber,
          currency: original.currency,
          amount: new Prisma.Decimal(original.amount).negated(),
          amountInCfa: new Prisma.Decimal(original.amountInCfa).negated(),
          paidAt: new Date(),
          isReversal: true,
          reversesId: original.id,
          purpose: `Correction reversal of payment ${paymentId}`,
          notes: v.reversalNotes ?? null,
        },
      });

      const correctedRecord = await tx.paymentRecord.create({
        data: {
          invoiceId: original.invoiceId,
          refTable: original.refTable,
          orderId: original.orderId,
          paidById: ctx.userId!,
          recipientType: v.recipientType,
          recipientName: v.recipientName,
          recipientSupplierId: v.recipientSupplierId ?? null,
          recipientUserId: v.recipientUserId ?? null,
          method: v.method,
          bankName: v.bankName ?? null,
          transactionReference: v.transactionReference ?? null,
          mobileMoneyProvider: v.mobileMoneyProvider ?? null,
          checkNumber: v.checkNumber ?? null,
          currency: v.currency,
          amount: v.amount,
          amountInCfa: v.amountInCfa,
          paidAt: v.paidAt,
          isReversal: false,
          purpose: v.purpose ?? null,
          notes: v.notes ?? null,
        },
      });

      await this.recalculateInvoiceAndOrder(
        tx,
        original.invoiceId,
        original.orderId,
        config
      );

      const [rev, cor] = await Promise.all([
        tx.paymentRecord.findUniqueOrThrow({
          where: { id: reversalRecord.id },
          include: PAYMENT_INCLUDE,
        }),
        tx.paymentRecord.findUniqueOrThrow({
          where: { id: correctedRecord.id },
          include: PAYMENT_INCLUDE,
        }),
      ]);

      return { reversal: rev, corrected: cor };
    });

    if (ctx.req) {
      logUserActivity(ctx.req, {
        operation: LogOperation.CREATE,
        category: LogCategory.WRITE,
        tableName: this.tableName,
        recordId: reversal.id,
        previousState: this.serializeForLog(original),
        newState: this.serializeForLog(reversal),
        changedFields: ["isReversal", "amount", "amountInCfa"],
        userId: ctx.userId,
        userEmail: ctx.userEmail || "system",
        requestId: ctx.requestId,
      });

      logUserActivity(ctx.req, {
        operation: LogOperation.CREATE,
        category: LogCategory.WRITE,
        tableName: this.tableName,
        recordId: corrected.id,
        newState: this.serializeForLog(corrected),
        userId: ctx.userId,
        userEmail: ctx.userEmail || "system",
        requestId: ctx.requestId,
      });
    }

    const order = await (prisma as any)[config.modelName].findUnique({
      where: { id: original.orderId },
    });
    if (order) {
      this.notifyOrderCreator(
        order.createdById,
        order.id,
        order.reference,
        config.refTable,
        NotificationType.PAYMENT_RECEIVED,
        "Payment Corrected",
        "Paiement corrigé",
        `A payment for order ${order.reference} has been corrected. Original: ${original.amount} ${original.currency}, Corrected: ${v.amount} ${v.currency}.`,
        `Un paiement pour la commande ${order.reference} a été corrigé. Original : ${original.amount} ${original.currency}, Corrigé : ${v.amount} ${v.currency}.`
      );
    }

    return { reversal, corrected };
  }

  async updatePaymentNotes(
    paymentId: string,
    data: UpdatePaymentNotesInput,
    ctx: ServiceContext
  ): Promise<PaymentRecord> {
    const result = updatePaymentNotesSchema.safeParse(data);
    if (!result.success) {
      const messages = result.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new AppError(messages, StatusCodes.BAD_REQUEST);
    }
    const v = result.data;

    const payment = await prisma.paymentRecord.findUnique({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new AppError("error.payment.not_found", StatusCodes.NOT_FOUND);
    }

    const previousState = { ...payment };

    const updated = await prisma.$transaction(async (tx) => {
      return tx.paymentRecord.update({
        where: { id: paymentId },
        data: {
          notes: v.notes !== undefined ? v.notes : payment.notes,
          purpose: v.purpose !== undefined ? v.purpose : payment.purpose,
        },
        include: PAYMENT_INCLUDE,
      });
    });

    if (ctx.req) {
      logUserActivity(ctx.req, {
        operation: LogOperation.UPDATE,
        category: LogCategory.WRITE,
        tableName: this.tableName,
        recordId: paymentId,
        previousState: this.serializeForLog(previousState),
        newState: this.serializeForLog(updated),
        changedFields: ["notes", "purpose"],
        userId: ctx.userId,
        userEmail: ctx.userEmail || "system",
        requestId: ctx.requestId,
      });
    }

    return updated;
  }

  async getPaymentsByOrder(
    orderId: string,
    refTable: string,
    ctx: ServiceContext
  ): Promise<PaymentRecord[]> {
    const config = getOrderTypeConfig(refTable);

    const order = await (prisma as any)[config.modelName].findFirst({
      where: { id: orderId, deletedAt: null },
    });
    if (!order) {
      throw new AppError(
        "error.payment.order_not_found",
        StatusCodes.NOT_FOUND
      );
    }

    return this.repository.findByOrderId(orderId);
  }

  async getPaymentById(
    paymentId: string,
    ctx: ServiceContext
  ): Promise<PaymentRecord> {
    const payment = await this.repository.findByIdWithRelations(paymentId);
    if (!payment) {
      throw new AppError("error.payment.not_found", StatusCodes.NOT_FOUND);
    }
    return payment;
  }

  private async recalculateInvoiceAndOrder(
    tx: Prisma.TransactionClient,
    invoiceId: string,
    orderId: string,
    config: OrderTypeConfig
  ): Promise<void> {
    const allPayments = await tx.paymentRecord.findMany({
      where: { invoiceId },
    });

    let totalPaid = new Prisma.Decimal(0);
    for (const p of allPayments) {
      const isReversed = await tx.paymentRecord.findFirst({
        where: { reversesId: p.id },
      });
      if (isReversed && !p.isReversal) {
        continue;
      }
      if (p.isReversal) {
        continue;
      }
      totalPaid = totalPaid.add(p.amount);
    }

    const invoice = await tx.exploitationInvoice.findUniqueOrThrow({
      where: { id: invoiceId },
    });

    const invoiceTotal = new Prisma.Decimal(invoice.total);

    let invoiceStatus: ExploitationInvoiceStatus;
    let paymentStatus: PaymentStatus;

    if (totalPaid.gte(invoiceTotal)) {
      invoiceStatus = ExploitationInvoiceStatus.PAID;
      paymentStatus = PaymentStatus.PAID;
    } else if (totalPaid.gt(0)) {
      invoiceStatus = ExploitationInvoiceStatus.PARTIAL;
      paymentStatus = PaymentStatus.PARTIAL;
    } else {
      invoiceStatus = ExploitationInvoiceStatus.UNPAID;
      paymentStatus = PaymentStatus.PENDING;
    }

    await tx.exploitationInvoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: totalPaid,
        status: invoiceStatus,
        paidAt:
          invoiceStatus === ExploitationInvoiceStatus.PAID ? new Date() : null,
      },
    });

    await (tx as any)[config.modelName].update({
      where: { id: orderId },
      data: {
        paymentStatus,
      },
    });

    if (paymentStatus === PaymentStatus.PAID) {
      const order = await (tx as any)[config.modelName].findUniqueOrThrow({
        where: { id: orderId },
      });
      if (order.status === OrderStatus.APPROVED) {
        await (tx as any)[config.modelName].update({
          where: { id: orderId },
          data: { status: OrderStatus.FINALIZED },
        });
      }
    }

    if (paymentStatus !== PaymentStatus.PAID) {
      const order = await (tx as any)[config.modelName].findUniqueOrThrow({
        where: { id: orderId },
      });
      if (order.status === OrderStatus.FINALIZED) {
        await (tx as any)[config.modelName].update({
          where: { id: orderId },
          data: { status: OrderStatus.APPROVED },
        });
      }
    }

    const orderForMetrics = await (tx as any)[config.modelName].findUnique({
      where: { id: orderId },
      select: { supplierId: true },
    });
    if (orderForMetrics?.supplierId) {
      const sid = orderForMetrics.supplierId;
      setTimeout(() => {
        recalculateSupplierMetrics(sid).catch((err) =>
          console.error(
            "[PaymentService] Supplier metrics recalculation failed:",
            err
          )
        );
      }, 0);
    }
  }

  private serializeForLog(record: any): Record<string, any> {
    if (!record) return {};
    const serialized: Record<string, any> = {};
    for (const [key, value] of Object.entries(record)) {
      if (value instanceof Prisma.Decimal) {
        serialized[key] = value.toString();
      } else if (typeof value === "bigint") {
        serialized[key] = value.toString();
      } else if (value instanceof Date) {
        serialized[key] = value.toISOString();
      } else if (value !== null && typeof value === "object") {
        serialized[key] = this.serializeForLog(value);
      } else {
        serialized[key] = value;
      }
    }
    return serialized;
  }

  private notifyOrderCreator(
    creatorId: string,
    orderId: string,
    orderReference: string,
    refTable: string,
    type: NotificationType,
    titleEn: string,
    titleFr: string,
    bodyEn: string,
    bodyFr: string
  ): void {
    sendAndDispatch({
      type,
      priority: NotificationPriority.HIGH,
      target: { type: "user", userId: creatorId },
      titleEnglish: titleEn,
      titleFrench: titleFr,
      bodyEnglish: bodyEn,
      bodyFrench: bodyFr,
      refTable,
      refId: orderId,
      data: { orderId, reference: orderReference },
    }).catch((err) =>
      console.error("[PaymentService] Notification failed:", err)
    );
  }
}
