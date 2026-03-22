import { z } from "zod";
import { BaseService } from "src/base/BaseService";
import { OrderEmailRepository } from "./supplierEmail.repository";
import {
  createSupplierEmailSchema,
  CreateSupplierEmailInput,
} from "./supplierEmail.schema";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import { OrderEmail } from "src/generated/prisma";
import { prisma } from "src";
import { LogCategory, LogOperation } from "@appTypes/log.type";
import { readFileSync } from "fs";
import path from "path";
import { sendEmail } from "@utils/sendEmail.util";

const ORDER_TYPE_CONFIG = {
  GAS: {
    refTable: "gas_purchase_orders",
    model: "gasPurchaseOrder" as const,
  },
  GAS_BOTTLE: {
    refTable: "gas_bottle_purchase_orders",
    model: "gasBottlePurchaseOrder" as const,
  },
  ACCESSORY: {
    refTable: "accessory_purchase_orders",
    model: "accessoryPurchaseOrder" as const,
  },
};

export class OrderEmailService extends BaseService<
  OrderEmail,
  CreateSupplierEmailInput
> {
  protected repository: OrderEmailRepository;
  protected tableName = "order_emails";
  protected createSchema = createSupplierEmailSchema;

  constructor() {
    super();
    this.repository = new OrderEmailRepository();
  }

  protected async beforeCreate(
    data: CreateSupplierEmailInput,
    ctx: ServiceContext
  ): Promise<CreateSupplierEmailInput> {
    return data;
  }

  async createOrderEmail(
    data: CreateSupplierEmailInput,
    ctx: ServiceContext
  ): Promise<OrderEmail> {
    const result = createSupplierEmailSchema.safeParse(data);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message)[0];
      throw new AppError(messages, StatusCodes.BAD_REQUEST);
    }

    const body = result.data;
    const config = ORDER_TYPE_CONFIG[body.orderType];

    const order = await (prisma[config.model] as any).findUnique({
      where: { id: body.orderId, deletedAt: null },
    });

    if (!order) {
      throw new AppError(
        "error.orderEmail.no_such_order_id",
        StatusCodes.NOT_FOUND
      );
    }

    if (order.status !== "FINALIZED") {
      throw new AppError(
        "error.orderEmail.order_not_finalized",
        StatusCodes.BAD_REQUEST
      );
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: body.supplierId, deletedAt: null },
      include: {
        contacts: {
          where: { id: body.contactId, deletedAt: null, isActive: true },
        },
      },
    });

    if (!supplier) {
      throw new AppError(
        "error.validation.invalid_supplier_id",
        StatusCodes.NOT_FOUND
      );
    }

    const contact = supplier.contacts[0];
    if (!contact || !contact.email) {
      throw new AppError(
        "error.orderEmail.supplier_contact_no_email",
        StatusCodes.BAD_REQUEST
      );
    }

    const htmlBody = await this.renderPOEmail(order, supplier, contact, body);

    const subject = `Bon de Commande ${order.reference} — INFOTECH S.A`;

    const brevoResult = await sendEmail(
      contact.email,
      subject,
      body.message,
      htmlBody
    );

    const email = await prisma.orderEmail.create({
      data: {
        refTable: config.refTable,
        orderId: order.id,
        supplierId: supplier.id,
        recipientEmail: contact.email,
        recipientName: contact.name,
        subject,
        htmlBody: htmlBody.replace(/[^\x00-\xFF]/g, function (char) {
          return "&#" + char.charCodeAt(0) + ";";
        }),
        userMessage: body.message,
        sentById: ctx.userId || "",
        brevoMessageId: brevoResult?.messageId ?? null,
        deliveryStatus: "SENT",
      },
    });

    await (prisma[config.model] as any).update({
      where: { id: order.id },
      data: { emailSentAt: new Date() },
    });

    if (ctx.req) {
      this.log(ctx.req, {
        operation: LogOperation.CREATE,
        category: LogCategory.WRITE,
        recordId: email.id,
        newState: email,
        userId: ctx.userId,
        userEmail: ctx.userEmail || "system",
        requestId: ctx.requestId,
      });
    }

    return email;
  }

  private async renderPOEmail(
    order: any,
    supplier: any,
    contact: any,
    body: CreateSupplierEmailInput
  ): Promise<string> {
    const adminConfig = await prisma.adminConfig.findUnique({
      where: { id: "MAIN" },
    });

    let lineItems: any[] = [];

    if (body.orderType === "GAS") {
      lineItems = await prisma.gasPurchaseOrderItem.findMany({
        where: { orderId: order.id },
      });
    } else if (body.orderType === "GAS_BOTTLE") {
      lineItems = await prisma.gasBottlePurchaseOrderItem.findMany({
        where: { orderId: order.id },
        include: { bottleType: true },
      });
    } else if (body.orderType === "ACCESSORY") {
      lineItems = await prisma.accessoryPurchaseOrderItem.findMany({
        where: { orderId: order.id },
        include: { item: true },
      });
    }

    const depot = order.depotId
      ? await prisma.exploitationDepot.findUnique({
          where: { id: order.depotId },
        })
      : null;

    const templateName = `po_${body.orderType.toLowerCase()}`;
    const templatePath = path.join(
      process.cwd(),
      process.env.NODE_ENV === "development"
        ? `src/public/templates/${templateName}.template.html`
        : `dist/public/templates/${templateName}.template.html`
    );

    const baseUrl = process.env.BASE_URL || "http://localhost:8080";
    let html = readFileSync(templatePath, "utf-8");

    html = html
      .replace(
        /{{logoUrl}}/g,
        adminConfig?.logoUrl || `${baseUrl}/assets/logo.png`
      )
      .replace(/{{companyEmail}}/g, adminConfig?.companyEmail ?? "")
      .replace(/{{companyPhone}}/g, adminConfig?.companyPhoneNumber ?? "")
      .replace(/{{year}}/g, `${new Date().getFullYear()}`);

    html = html
      .replace(/{{orderReference}}/g, order.reference)
      .replace(
        /{{orderDate}}/g,
        new Date(order.createdAt).toLocaleDateString("fr-FR")
      )
      .replace(/{{orderPriority}}/g, order.priority ?? "NORMAL")
      .replace(/{{currency}}/g, order.currency ?? "XAF");

    html = html
      .replace(/{{supplierName}}/g, supplier.fullName || supplier.name)
      .replace(/{{contactName}}/g, contact.name)
      .replace(/{{contactEmail}}/g, contact.email);

    html = html
      .replace(/{{depotName}}/g, depot?.name ?? "—")
      .replace(/{{depotCity}}/g, depot?.city ?? "—")
      .replace(
        /{{requestedDate}}/g,
        order.requestedDate
          ? new Date(order.requestedDate).toLocaleDateString("fr-FR")
          : "—"
      );

    html = html
      .replace(/{{subTotal}}/g, formatCurrency(order.subTotal, order.currency))
      .replace(/{{vatPct}}/g, `${order.vatPct}`)
      .replace(
        /{{vatAmount}}/g,
        formatCurrency(order.vatAmount, order.currency)
      )
      .replace(/{{regulatoryTaxPct}}/g, `${order.regulatoryTaxPct ?? "0"}`)
      .replace(
        /{{regulatoryTaxAmount}}/g,
        formatCurrency(order.regulatoryTaxAmt, order.currency)
      )
      .replace(/{{total}}/g, formatCurrency(order.total, order.currency))
      .replace(
        /{{totalInCfa}}/g,
        order.totalInCfa ? formatCurrency(order.totalInCfa, "XAF") : "—"
      );

    const lineItemsHtml = lineItems
      .map((item, index) => {
        const name =
          body.orderType === "GAS"
            ? item.name
            : body.orderType === "GAS_BOTTLE"
            ? item.bottleType?.name || item.bottleType?.code
            : item.item?.name || item.item?.sku;

        const qty =
          body.orderType === "GAS"
            ? `${item.quantity} ${item.unit}`
            : `${item.quantity}`;

        return `<tr>
          <td>${index + 1}</td>
          <td>${name}</td>
          <td>${item.description ?? item.code ?? "—"}</td>
          <td>${qty}</td>
          <td>${formatCurrency(item.unitPrice, order.currency)}</td>
          <td>${formatCurrency(item.lineTotal, order.currency)}</td>
        </tr>`;
      })
      .join("\n");

    html = html.replace(/{{lineItems}}/g, lineItemsHtml);

    html = html.replace(/{{userMessage}}/g, body.message || "");

    if (body.orderType === "ACCESSORY") {
      html = html
        .replace(/{{transportMode}}/g, order.transportMode ?? "—")
        .replace(
          /{{estimatedTransitDays}}/g,
          `${order.estimatedTransitDays ?? "—"}`
        )
        .replace(
          /{{freightFees}}/g,
          formatCurrency(order.freightFees, order.currency)
        )
        .replace(
          /{{customsDuties}}/g,
          formatCurrency(order.customsDuties, order.currency)
        )
        .replace(
          /{{insuranceAmount}}/g,
          formatCurrency(order.insuranceAmount, order.currency)
        );
    }

    return html;
  }
}

function formatCurrency(value: any, currency: string = "XAF"): string {
  if (value == null) return "—";
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(num)) return "—";

  const locale = currency === "XAF" ? "fr-FR" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}
