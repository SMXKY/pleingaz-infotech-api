import { Prisma, OrderStatus } from "src/generated/prisma";
import prisma from "@models/index.model";
import { convertCurrencyNoTransaction } from "./currencyConverter.util";
import { Currency } from "@appTypes/preferences.type";

export async function recalculateSupplierMetrics(
  supplierId: string
): Promise<void> {
  const [gasOrders, bottleOrders, accessoryOrders] = await Promise.all([
    prisma.gasPurchaseOrder.findMany({
      where: { supplierId, deletedAt: null },
      select: {
        id: true,
        status: true,
        currency: true,
        totalInCfa: true,
        total: true,
        requestedDate: true,
        collectionDate: true,
        arrivalDate: true,
        createdAt: true,
      },
    }),
    prisma.gasBottlePurchaseOrder.findMany({
      where: { supplierId, deletedAt: null },
      select: {
        id: true,
        status: true,
        currency: true,
        total: true,
        requestedDeliveryDate: true,
        actualDeliveryDate: true,
        createdAt: true,
      },
    }),
    prisma.accessoryPurchaseOrder.findMany({
      where: { supplierId, deletedAt: null },
      select: {
        id: true,
        status: true,
        currency: true,
        totalEstimate: true,
        estimatedArrivalDate: true,
        actualArrivalDate: true,
        createdAt: true,
      },
    }),
  ]);

  const totalOrders =
    gasOrders.length + bottleOrders.length + accessoryOrders.length;

  const completedGas = gasOrders.filter(
    (o) => o.status === OrderStatus.COMPLETED
  );
  const completedBottle = bottleOrders.filter(
    (o) => o.status === OrderStatus.COMPLETED
  );
  const completedAccessory = accessoryOrders.filter(
    (o) => o.status === OrderStatus.COMPLETED
  );
  const completedOrders =
    completedGas.length + completedBottle.length + completedAccessory.length;

  let onTimeDeliveries = 0;
  let totalLeadDays = 0;
  let leadDaysCount = 0;

  for (const o of completedGas) {
    const requested = o.requestedDate || o.collectionDate;
    const actual = o.arrivalDate;
    if (requested && actual) {
      if (new Date(actual) <= new Date(requested)) {
        onTimeDeliveries++;
      }

      const leadMs =
        new Date(actual).getTime() - new Date(o.createdAt).getTime();
      const leadDays = Math.max(0, leadMs / (1000 * 60 * 60 * 24));
      totalLeadDays += leadDays;
      leadDaysCount++;
    } else if (requested && !actual) {
      onTimeDeliveries++;
    }
  }

  for (const o of completedBottle) {
    const requested = o.requestedDeliveryDate;
    const actual = o.actualDeliveryDate;
    if (requested && actual) {
      if (new Date(actual) <= new Date(requested)) {
        onTimeDeliveries++;
      }
      const leadMs =
        new Date(actual).getTime() - new Date(o.createdAt).getTime();
      const leadDays = Math.max(0, leadMs / (1000 * 60 * 60 * 24));
      totalLeadDays += leadDays;
      leadDaysCount++;
    } else if (requested && !actual) {
      onTimeDeliveries++;
    }
  }

  for (const o of completedAccessory) {
    const requested = o.estimatedArrivalDate;
    const actual = o.actualArrivalDate;
    if (requested && actual) {
      if (new Date(actual) <= new Date(requested)) {
        onTimeDeliveries++;
      }
      const leadMs =
        new Date(actual).getTime() - new Date(o.createdAt).getTime();
      const leadDays = Math.max(0, leadMs / (1000 * 60 * 60 * 24));
      totalLeadDays += leadDays;
      leadDaysCount++;
    } else if (requested && !actual) {
      onTimeDeliveries++;
    }
  }

  const onTimeDeliveryPct =
    completedOrders > 0
      ? new Prisma.Decimal(
          (onTimeDeliveries / completedOrders) * 100
        ).toDecimalPlaces(2)
      : new Prisma.Decimal(0);

  const avgLeadTimeDays =
    leadDaysCount > 0
      ? new Prisma.Decimal(totalLeadDays / leadDaysCount).toDecimalPlaces(1)
      : null;

  let totalSpendCfa = new Prisma.Decimal(0);

  for (const o of completedGas) {
    if (o.totalInCfa) {
      totalSpendCfa = totalSpendCfa.add(o.totalInCfa);
    } else if (o.total) {
      try {
        const cfa = await convertCurrencyNoTransaction(
          Number(o.total),
          o.currency as Currency,
          Currency.XAF
        );
        totalSpendCfa = totalSpendCfa.add(new Prisma.Decimal(cfa));
      } catch {
        totalSpendCfa = totalSpendCfa.add(o.total);
      }
    }
  }

  for (const o of completedBottle) {
    if (o.total) {
      try {
        const cfa = await convertCurrencyNoTransaction(
          Number(o.total),
          o.currency as Currency,
          Currency.XAF
        );
        totalSpendCfa = totalSpendCfa.add(new Prisma.Decimal(cfa));
      } catch {
        totalSpendCfa = totalSpendCfa.add(o.total);
      }
    }
  }

  for (const o of completedAccessory) {
    if (o.totalEstimate) {
      try {
        const cfa = await convertCurrencyNoTransaction(
          Number(o.totalEstimate),
          o.currency as Currency,
          Currency.XAF
        );
        totalSpendCfa = totalSpendCfa.add(new Prisma.Decimal(cfa));
      } catch {
        totalSpendCfa = totalSpendCfa.add(o.totalEstimate);
      }
    }
  }

  const allDates: Date[] = [];
  for (const o of gasOrders) allDates.push(o.createdAt);
  for (const o of bottleOrders) allDates.push(o.createdAt);
  for (const o of accessoryOrders) allDates.push(o.createdAt);

  const lastOrderDate =
    allDates.length > 0
      ? allDates.reduce((latest, d) => (d > latest ? d : latest))
      : null;

  let rating: Prisma.Decimal | null = null;
  if (totalOrders > 0) {
    const completionRate = completedOrders / totalOrders;
    const onTimeRate =
      completedOrders > 0 ? onTimeDeliveries / completedOrders : 0;
    const volumeBonus = Math.min(totalOrders / 50, 1);

    const ratingValue =
      onTimeRate * 3.0 + completionRate * 1.5 + volumeBonus * 0.5;
    rating = new Prisma.Decimal(Math.min(ratingValue, 5.0)).toDecimalPlaces(1);
  }

  await prisma.supplierPerformanceMetrics.upsert({
    where: { supplierId },
    create: {
      supplierId,
      rating,
      totalOrders,
      completedOrders,
      onTimeDeliveries,
      onTimeDeliveryPct,
      avgLeadTimeDays,
      totalSpendCfa,
      lastOrderDate,
      lastCalculatedAt: new Date(),
    },
    update: {
      rating,
      totalOrders,
      completedOrders,
      onTimeDeliveries,
      onTimeDeliveryPct,
      avgLeadTimeDays,
      totalSpendCfa,
      lastOrderDate,
      lastCalculatedAt: new Date(),
    },
  });
}

export async function recalculateAllSupplierMetrics(): Promise<void> {
  const suppliers = await prisma.supplier.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });

  for (const supplier of suppliers) {
    try {
      await recalculateSupplierMetrics(supplier.id);
    } catch (err) {
      console.error(
        `[SupplierMetrics] Failed to recalculate for supplier ${supplier.id}:`,
        err
      );
    }
  }
}

export default recalculateSupplierMetrics;
