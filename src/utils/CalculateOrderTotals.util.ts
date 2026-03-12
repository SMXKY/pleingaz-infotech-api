import {
  GasPurchaseOrder,
  GasPurchaseOrderItem,
  GasBottlePurchaseOrder,
  GasBottlePurchaseOrderItem,
  AccessoryPurchaseOrder,
  AccessoryPurchaseOrderItem,
  Prisma,
} from "src/generated/prisma";
import { TransactionClient } from "src/modules/users/utilites/generateEmployeeId.util";
import convertCurrency from "./currencyConverter.util";
import { Currency } from "@appTypes/preferences.type";

class CalculateOrderTotals {
  static async gasPurchaseOrder(
    order: GasPurchaseOrder,
    tx: TransactionClient
  ) {
    const lineItems: GasPurchaseOrderItem[] =
      await tx.gasPurchaseOrderItem.findMany({
        where: { orderId: order.id },
      });

    let subtotal = new Prisma.Decimal(0);

    for (const item of lineItems) {
      const lineTotal = new Prisma.Decimal(item.unitPrice).mul(item.quantity);
      subtotal = subtotal.add(lineTotal);
    }

    const vatAmount = subtotal.mul(order.vatPct).div(100);
    const regulatoryTaxAmt = subtotal.mul(order.regulatoryTaxPct).div(100);
    const total = subtotal.add(vatAmount).add(regulatoryTaxAmt);

    const totalInCfa = await convertCurrency(
      tx,
      Number(total),
      order.currency,
      Currency.XAF
    );

    await tx.gasPurchaseOrder.update({
      where: { id: order.id },
      data: {
        subTotal: subtotal,
        vatAmount,
        regulatoryTaxAmt,
        total,
        totalInCfa,
      },
    });
  }

  static async gasBottlePurchaseOrder(
    order: GasBottlePurchaseOrder,
    tx: TransactionClient
  ) {
    const lineItems: GasBottlePurchaseOrderItem[] =
      await tx.gasBottlePurchaseOrderItem.findMany({
        where: { orderId: order.id },
      });

    let subtotal = new Prisma.Decimal(0);

    for (const item of lineItems) {
      const lineTotal = new Prisma.Decimal(item.unitPrice).mul(item.quantity);
      subtotal = subtotal.add(lineTotal);
    }

    const vatAmount = subtotal.mul(order.vatPct).div(100);
    const shippingCost = new Prisma.Decimal(order.shippingCost ?? 0);
    const total = subtotal.add(vatAmount).add(shippingCost);

    await tx.gasBottlePurchaseOrder.update({
      where: { id: order.id },
      data: {
        subTotal: subtotal,
        vatAmount,
        total,
      },
    });
  }

  static async accessoryPurchaseOrder(
    order: AccessoryPurchaseOrder,
    tx: TransactionClient
  ) {
    const lineItems: AccessoryPurchaseOrderItem[] =
      await tx.accessoryPurchaseOrderItem.findMany({
        where: { orderId: order.id },
      });

    let subtotal = new Prisma.Decimal(0);

    for (const item of lineItems) {
      const lineTotal = new Prisma.Decimal(item.unitPrice).mul(item.quantity);
      subtotal = subtotal.add(lineTotal);
    }

    const vatAmount = subtotal.mul(order.vatPct).div(100);
    const freightFees = new Prisma.Decimal(order.freightFees ?? 0);
    const customsDuties = new Prisma.Decimal(order.customsDuties ?? 0);
    const insuranceAmount = new Prisma.Decimal(order.insuranceAmount ?? 0);

    const totalEstimate = subtotal
      .add(vatAmount)
      .add(freightFees)
      .add(customsDuties)
      .add(insuranceAmount);

    await tx.accessoryPurchaseOrder.update({
      where: { id: order.id },
      data: {
        subTotal: subtotal,
        vatAmount,
        totalEstimate,
      },
    });
  }
}

export default CalculateOrderTotals;
