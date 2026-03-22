import { catchAsync } from "@utils/catchAsync.util";
import { NextFunction, Request, Response } from "express";
import { prisma } from "src";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { Prisma } from "src/generated/prisma";

const toNumber = (v: unknown): number =>
  v instanceof Prisma.Decimal ? v.toNumber() : Number(v ?? 0);

const resolveGroupBucket = (groupBy?: string): string => {
  const allowed = ["day", "week", "month"];
  if (groupBy && allowed.includes(groupBy)) return groupBy;
  return "month";
};

function resolveBucketSql(groupBy?: string): Prisma.Sql {
  switch (groupBy) {
    case "day":
      return Prisma.sql`day`;
    case "week":
      return Prisma.sql`week`;
    case "year":
      return Prisma.sql`year`;
    default:
      return Prisma.sql`month`;
  }
}

const gasPurchaseStatistics = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { startDate, endDate, groupBy, supplierId } = req.query as {
      startDate?: string;
      endDate?: string;
      groupBy?: string;
      supplierId?: string;
    };

    const bucketSql = resolveBucketSql(groupBy);

    const where: Prisma.GasPurchaseOrderWhereInput = { deletedAt: null };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as any).gte = new Date(startDate);
      if (endDate) (where.createdAt as any).lte = new Date(endDate);
    }
    if (supplierId) where.supplierId = supplierId;

    const [aggregates, orderCount] = await Promise.all([
      prisma.gasPurchaseOrder.aggregate({
        where,
        _sum: { totalInCfa: true },
        _avg: { totalInCfa: true },
      }),
      prisma.gasPurchaseOrder.count({ where }),
    ]);

    const joinDateFragments: Prisma.Sql[] = [Prisma.sql`o.deleted_at IS NULL`];
    if (startDate)
      joinDateFragments.push(
        Prisma.sql`o.created_at >= ${new Date(startDate)}`
      );
    if (endDate)
      joinDateFragments.push(Prisma.sql`o.created_at <= ${new Date(endDate)}`);
    if (supplierId)
      joinDateFragments.push(Prisma.sql`o.supplier_id = ${supplierId}`);
    const joinWhere = Prisma.join(joinDateFragments, " AND ");

    const directDateFragments: Prisma.Sql[] = [Prisma.sql`deleted_at IS NULL`];
    if (startDate)
      directDateFragments.push(
        Prisma.sql`created_at >= ${new Date(startDate)}`
      );
    if (endDate)
      directDateFragments.push(Prisma.sql`created_at <= ${new Date(endDate)}`);
    if (supplierId)
      directDateFragments.push(Prisma.sql`supplier_id = ${supplierId}`);
    const directWhere = Prisma.join(directDateFragments, " AND ");

    const volumeResult = await prisma.$queryRaw<[{ total_tons: number }]>`
      SELECT COALESCE(SUM(
        CASE
          WHEN i.unit = 'TONS'   THEN i.quantity
          WHEN i.unit = 'KG'     THEN i.quantity / 1000.0
          WHEN i.unit = 'LITERS' THEN i.quantity / 1000.0
          ELSE 0
        END
      ), 0)::float AS total_tons
      FROM gas_purchase_order_items i
      JOIN gas_purchase_orders o ON o.id = i.order_id
      WHERE ${joinWhere}
    `;

    const bucket = resolveGroupBucket(groupBy);
    const trendsQuery = buildTrendsQuery(bucket, directWhere);
    const trends = await prisma.$queryRaw<
      { period: string; order_count: number; total_spend: number }[]
    >(trendsQuery);

    const bySupplierRaw = await prisma.gasPurchaseOrder.groupBy({
      by: ["supplierId"],
      where,
      _count: { id: true },
      _sum: { totalInCfa: true },
    });

    const supplierIds = bySupplierRaw
      .map((s) => s.supplierId)
      .filter(Boolean) as string[];

    const suppliers =
      supplierIds.length > 0
        ? await prisma.supplier.findMany({
            where: { id: { in: supplierIds } },
            select: { id: true, name: true, code: true },
          })
        : [];
    const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

    const bySupplier = bySupplierRaw.map((row) => ({
      supplierId: row.supplierId,
      supplierName: supplierMap.get(row.supplierId ?? "")?.name ?? null,
      supplierCode: supplierMap.get(row.supplierId ?? "")?.code ?? null,
      orderCount: row._count.id,
      totalSpendCfa: toNumber(row._sum.totalInCfa),
    }));

    const byStatusRaw = await prisma.gasPurchaseOrder.groupBy({
      by: ["status"],
      where,
      _count: { id: true },
      _sum: { totalInCfa: true },
    });

    const byStatus = byStatusRaw.map((row) => ({
      status: row.status,
      orderCount: row._count.id,
      totalSpendCfa: toNumber(row._sum.totalInCfa),
    }));

    res.status(StatusCodes.OK).json({
      status: "success",
      data: {
        totalOrders: orderCount,
        totalVolumeTons: toNumber(volumeResult[0]?.total_tons),
        totalSpendCfa: toNumber(aggregates._sum.totalInCfa),
        avgOrderValue: toNumber(aggregates._avg.totalInCfa),
        trends,
        bySupplier,
        byStatus,
      },
    });
  }
);
function buildTrendsQuery(
  bucketSql: string,
  directWhere: Prisma.Sql
): Prisma.Sql {
  switch (bucketSql) {
    case "day":
      return Prisma.sql`
        SELECT
          TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS period,
          COUNT(*)::int AS order_count,
          COALESCE(SUM(total_in_cfa), 0)::float AS total_spend
        FROM gas_purchase_orders
        WHERE ${directWhere}
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY DATE_TRUNC('day', created_at) ASC
      `;
    case "week":
      return Prisma.sql`
        SELECT
          TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD') AS period,
          COUNT(*)::int AS order_count,
          COALESCE(SUM(total_in_cfa), 0)::float AS total_spend
        FROM gas_purchase_orders
        WHERE ${directWhere}
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY DATE_TRUNC('week', created_at) ASC
      `;
    case "year":
      return Prisma.sql`
        SELECT
          TO_CHAR(DATE_TRUNC('year', created_at), 'YYYY-MM-DD') AS period,
          COUNT(*)::int AS order_count,
          COALESCE(SUM(total_in_cfa), 0)::float AS total_spend
        FROM gas_purchase_orders
        WHERE ${directWhere}
        GROUP BY DATE_TRUNC('year', created_at)
        ORDER BY DATE_TRUNC('year', created_at) ASC
      `;
    default:
      return Prisma.sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM-DD') AS period,
          COUNT(*)::int AS order_count,
          COALESCE(SUM(total_in_cfa), 0)::float AS total_spend
        FROM gas_purchase_orders
        WHERE ${directWhere}
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) ASC
      `;
  }
}
const gasPurchaseDashboard = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const baseWhere: Prisma.GasPurchaseOrderWhereInput = { deletedAt: null };

    const [
      totalOrders,
      pendingApprovals,
      pendingPayments,
      monthlyAgg,
      byStatus,
      byPaymentStatus,
      recentOrders,
    ] = await Promise.all([
      prisma.gasPurchaseOrder.count({ where: baseWhere }),

      prisma.gasPurchaseOrder.count({
        where: { ...baseWhere, status: "PENDING_APPROVAL" },
      }),

      prisma.gasPurchaseOrder.count({
        where: { ...baseWhere, paymentStatus: "PENDING" },
      }),

      prisma.gasPurchaseOrder.aggregate({
        where: { ...baseWhere, createdAt: { gte: startOfMonth } },
        _sum: { totalInCfa: true },
        _count: { id: true },
      }),

      prisma.gasPurchaseOrder.groupBy({
        by: ["status"],
        where: baseWhere,
        _count: { id: true },
      }),

      prisma.gasPurchaseOrder.groupBy({
        by: ["paymentStatus"],
        where: baseWhere,
        _count: { id: true },
      }),

      prisma.gasPurchaseOrder.findMany({
        where: baseWhere,
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          reference: true,
          status: true,
          paymentStatus: true,
          priority: true,
          totalInCfa: true,
          currency: true,
          createdAt: true,
          supplier: { select: { id: true, name: true, code: true } },
        },
      }),
    ]);

    const monthlyVolume = await prisma.$queryRaw<[{ total_tons: number }]>`
      SELECT COALESCE(SUM(
        CASE
          WHEN i.unit = 'TONS'   THEN i.quantity
          WHEN i.unit = 'KG'     THEN i.quantity / 1000.0
          WHEN i.unit = 'LITERS' THEN i.quantity / 1000.0
          ELSE 0
        END
      ), 0)::float AS total_tons
      FROM gas_purchase_order_items i
      JOIN gas_purchase_orders o ON o.id = i.order_id
      WHERE o.deleted_at IS NULL
        AND o.created_at >= ${startOfMonth}
    `;

    const topSuppliersRaw = await prisma.gasPurchaseOrder.groupBy({
      by: ["supplierId"],
      where: baseWhere,
      _count: { id: true },
      _sum: { totalInCfa: true },
      orderBy: { _sum: { totalInCfa: "desc" } },
      take: 5,
    });

    const supplierIds = topSuppliersRaw
      .map((s) => s.supplierId)
      .filter(Boolean) as string[];
    const suppliers =
      supplierIds.length > 0
        ? await prisma.supplier.findMany({
            where: { id: { in: supplierIds } },
            select: { id: true, name: true, code: true },
          })
        : [];
    const sMap = new Map(suppliers.map((s) => [s.id, s]));

    res.status(StatusCodes.OK).json({
      status: "success",
      data: {
        totalOrders,
        pendingApprovals,
        pendingPayments,
        monthlyOrderCount: monthlyAgg._count.id,
        monthlySpendCfa: toNumber(monthlyAgg._sum.totalInCfa),
        monthlyVolumeTons: toNumber(monthlyVolume[0]?.total_tons),
        byStatus: byStatus.map((r) => ({
          status: r.status,
          count: r._count.id,
        })),
        byPaymentStatus: byPaymentStatus.map((r) => ({
          paymentStatus: r.paymentStatus,
          count: r._count.id,
        })),
        topSuppliers: topSuppliersRaw.map((r) => ({
          supplierId: r.supplierId,
          supplierName: sMap.get(r.supplierId ?? "")?.name ?? null,
          supplierCode: sMap.get(r.supplierId ?? "")?.code ?? null,
          orderCount: r._count.id,
          totalSpendCfa: toNumber(r._sum.totalInCfa),
        })),
        recentOrders,
      },
    });
  }
);

const bottleDashboard = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const baseWhere: Prisma.GasBottlePurchaseOrderWhereInput = {
      deletedAt: null,
    };

    const [
      totalOrders,
      pendingApprovals,
      pendingPayments,
      monthlyAgg,
      recentOrders,
    ] = await Promise.all([
      prisma.gasBottlePurchaseOrder.count({ where: baseWhere }),

      prisma.gasBottlePurchaseOrder.count({
        where: { ...baseWhere, status: "PENDING_APPROVAL" },
      }),

      prisma.gasBottlePurchaseOrder.count({
        where: { ...baseWhere, paymentStatus: "PENDING" },
      }),

      prisma.gasBottlePurchaseOrder.aggregate({
        where: { ...baseWhere, createdAt: { gte: startOfMonth } },
        _sum: { total: true },
        _count: { id: true },
      }),

      prisma.gasBottlePurchaseOrder.findMany({
        where: baseWhere,
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          reference: true,
          status: true,
          paymentStatus: true,
          total: true,
          currency: true,
          createdAt: true,
          supplier: { select: { id: true, name: true, code: true } },
        },
      }),
    ]);

    const bottleTypeBreakdownRaw =
      await prisma.gasBottlePurchaseOrderItem.groupBy({
        by: ["bottleTypeId"],
        where: { order: { deletedAt: null } },
        _sum: { quantity: true, lineTotal: true },
        _count: { id: true },
      });

    const btIds = bottleTypeBreakdownRaw.map((b) => b.bottleTypeId);
    const bottleTypes =
      btIds.length > 0
        ? await prisma.gasBottleType.findMany({
            where: { id: { in: btIds } },
            select: {
              id: true,
              code: true,
              name: true,
              size: true,
              category: true,
              capacityKg: true,
            },
          })
        : [];
    const btMap = new Map(bottleTypes.map((bt) => [bt.id, bt]));

    const totalBottlesPurchased = bottleTypeBreakdownRaw.reduce(
      (acc, row) => acc + (row._sum.quantity ?? 0),
      0
    );

    const bottleTypeBreakdown = bottleTypeBreakdownRaw.map((row) => {
      const bt = btMap.get(row.bottleTypeId);
      return {
        bottleTypeId: row.bottleTypeId,
        code: bt?.code ?? null,
        name: bt?.name ?? null,
        size: bt?.size ?? null,
        category: bt?.category ?? null,
        capacityKg: bt ? toNumber(bt.capacityKg) : null,
        totalQuantity: row._sum.quantity ?? 0,
        totalSpend: toNumber(row._sum.lineTotal),
        orderLineCount: row._count.id,
      };
    });

    res.status(StatusCodes.OK).json({
      status: "success",
      data: {
        totalOrders,
        pendingApprovals,
        pendingPayments,
        totalBottlesPurchased,
        monthlyOrderCount: monthlyAgg._count.id,
        monthlySpend: toNumber(monthlyAgg._sum.total),
        bottleTypeBreakdown,
        recentOrders,
      },
    });
  }
);

const accessoryDashboard = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const baseWhere: Prisma.AccessoryPurchaseOrderWhereInput = {
      deletedAt: null,
    };

    const [
      totalOrders,
      pendingOrders,
      pendingApprovals,
      pendingPayments,
      monthlyAgg,
      recentOrders,
      activeSupplierGroups,
    ] = await Promise.all([
      prisma.accessoryPurchaseOrder.count({ where: baseWhere }),

      prisma.accessoryPurchaseOrder.count({
        where: {
          ...baseWhere,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
      }),

      prisma.accessoryPurchaseOrder.count({
        where: { ...baseWhere, status: "PENDING_APPROVAL" },
      }),

      prisma.accessoryPurchaseOrder.count({
        where: { ...baseWhere, paymentStatus: "PENDING" },
      }),

      prisma.accessoryPurchaseOrder.aggregate({
        where: { ...baseWhere, createdAt: { gte: startOfMonth } },
        _sum: { totalEstimate: true },
        _count: { id: true },
      }),

      prisma.accessoryPurchaseOrder.findMany({
        where: baseWhere,
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          reference: true,
          status: true,
          paymentStatus: true,
          transportMode: true,
          totalEstimate: true,
          currency: true,
          createdAt: true,
          supplier: { select: { id: true, name: true, code: true } },
        },
      }),

      prisma.accessoryPurchaseOrder.groupBy({
        by: ["supplierId"],
        where: baseWhere,
      }),
    ]);

    const lowStockAlerts = await prisma.$queryRaw<
      {
        id: string;
        sku: string;
        name: string;
        current_stock: number;
        reorder_level: number;
        category_id: string;
        category_name: string;
        category_code: string;
      }[]
    >`
      SELECT
        ai.id, ai.sku, ai.name,
        ai.current_stock,
        ai.reorder_level,
        ac.id   AS category_id,
        ac.name AS category_name,
        ac.code AS category_code
      FROM accessory_items ai
      JOIN accessory_categories ac ON ac.id = ai.category_id
      WHERE ai.deleted_at IS NULL
        AND ai.is_active = true
        AND ai.reorder_level IS NOT NULL
        AND ai.current_stock <= ai.reorder_level
      ORDER BY (ai.current_stock::float / GREATEST(ai.reorder_level, 1)::float) ASC
    `;

    const categories = await prisma.$queryRaw<
      {
        category_id: string;
        category_name: string;
        category_code: string;
        total_quantity: number;
        total_spend: number;
        order_line_count: number;
      }[]
    >`
      SELECT
        ac.id   AS category_id,
        ac.name AS category_name,
        ac.code AS category_code,
        COALESCE(SUM(aoi.quantity), 0)::int      AS total_quantity,
        COALESCE(SUM(aoi.line_total), 0)::float  AS total_spend,
        COUNT(aoi.id)::int                        AS order_line_count
      FROM accessory_purchase_order_items aoi
      JOIN accessory_items ai  ON ai.id  = aoi.item_id
      JOIN accessory_categories ac ON ac.id = ai.category_id
      JOIN accessory_purchase_orders apo ON apo.id = aoi.order_id
      WHERE apo.deleted_at IS NULL
      GROUP BY ac.id, ac.name, ac.code
      ORDER BY total_spend DESC
    `;

    res.status(StatusCodes.OK).json({
      status: "success",
      data: {
        totalOrders,
        pendingOrders,
        pendingApprovals,
        pendingPayments,
        activeSuppliers: activeSupplierGroups.length,
        monthlyOrderCount: monthlyAgg._count.id,
        monthlySpend: toNumber(monthlyAgg._sum.totalEstimate),
        lowStockAlerts: lowStockAlerts.map((item) => ({
          id: item.id,
          sku: item.sku,
          name: item.name,
          currentStock: item.current_stock,
          reorderLevel: item.reorder_level,
          category: {
            id: item.category_id,
            name: item.category_name,
            code: item.category_code,
          },
        })),
        categories,
        recentOrders,
      },
    });
  }
);

export const dashboardAndAnalyticsController = {
  gasPurchaseStatistics,
  gasPurchaseDashboard,
  bottleDashboard,
  accessoryDashboard,
};
