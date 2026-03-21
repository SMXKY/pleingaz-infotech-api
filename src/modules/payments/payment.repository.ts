import { BaseRepository } from "src/base/BaseRepository";
import { PaymentRecord } from "src/generated/prisma";
import { FilterParams } from "@appTypes/base.types";
import prisma from "@models/index.model";
import { Prisma } from "src/generated/prisma";

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

export class PaymentRepository extends BaseRepository<PaymentRecord> {
  protected modelName = "paymentRecord";
  protected hasSystemField = false;

  async findByIdWithRelations(id: string): Promise<PaymentRecord | null> {
    return prisma.paymentRecord.findUnique({
      where: { id },
      include: PAYMENT_INCLUDE,
    });
  }

  async findByInvoiceId(invoiceId: string): Promise<PaymentRecord[]> {
    return prisma.paymentRecord.findMany({
      where: { invoiceId },
      include: PAYMENT_INCLUDE,
      orderBy: { recordedAt: "desc" },
    });
  }

  async findByOrderId(orderId: string): Promise<PaymentRecord[]> {
    return prisma.paymentRecord.findMany({
      where: { orderId },
      include: PAYMENT_INCLUDE,
      orderBy: { recordedAt: "desc" },
    });
  }

  async sumNonReversedByInvoice(
    invoiceId: string,
    tx?: Prisma.TransactionClient
  ): Promise<Prisma.Decimal> {
    const client = tx || prisma;
    const result = await client.paymentRecord.aggregate({
      where: {
        invoiceId,
        reversedBy: null, // not reversed
      },
      _sum: { amount: true },
    });
    return result._sum.amount ?? new Prisma.Decimal(0);
  }

  protected buildWhereClause(filters: FilterParams): Record<string, any> {
    const where: Record<string, any> = {};

    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === "") continue;

      if (
        key === "invoiceId" ||
        key === "orderId" ||
        key === "paidById" ||
        key === "recipientSupplierId" ||
        key === "recipientUserId"
      ) {
        where[key] = value;
      } else if (key === "method" || key === "recipientType" || key === "currency") {
        where[key] = value;
      } else if (key === "isReversal") {
        where[key] = value === "true" || value === true;
      } else if (typeof value === "string" && !this.isUuid(value)) {
        where[key] = { contains: value, mode: "insensitive" };
      } else {
        where[key] = value;
      }
    }

    return where;
  }
}
