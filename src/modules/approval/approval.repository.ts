import { Approval, ApprovalRole } from "src/generated/prisma";
import prisma from "@models/index.model";
import { BaseRepository } from "src/base/BaseRepository";
import { FilterParams } from "@appTypes/base.types";

const APPROVAL_INCLUDE = {
  steps: {
    orderBy: { step: "asc" as const },
    include: {
      decidedBy: {
        select: { id: true, name: true, surname: true, email: true },
      },
    },
  },
  requestedBy: {
    select: { id: true, name: true, surname: true, email: true },
  },
};

export class ApprovalRepository extends BaseRepository<Approval> {
  protected modelName = "approval";
  protected hasSystemField = false;

  async findByRecord(
    recordId: string,
    entityType: string
  ): Promise<Approval | null> {
    return prisma.approval.findFirst({
      where: { recordId, entityType: entityType as any },
      include: APPROVAL_INCLUDE,
    });
  }

  protected buildWhereClause(filters: FilterParams): Record<string, any> {
    const where: Record<string, any> = {};

    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === "") continue;

      if (typeof value === "string" && !this.isUuid(value)) {
        where[key] = { contains: value, mode: "insensitive" };
      } else {
        where[key] = value;
      }
    }

    return where;
  }

  async findById(id: string): Promise<Approval | null> {
    return prisma.approval.findUnique({
      where: { id },
      include: APPROVAL_INCLUDE,
    });
  }

  async findByInvolvement(
    userId: string,
    userApprovalRoles: ApprovalRole[],
    options: {
      pagination?: {
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
      };
      filters?: Record<string, any>;
      include?: any;
      select?: any;
    } = {}
  ): Promise<{
    data: Approval[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const { pagination = {}, filters = {}, include, select } = options;

    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;
    const sortBy = pagination.sortBy || "createdAt";
    const sortOrder = pagination.sortOrder || "desc";

    const filterWhere = this.buildWhereClause(filters);

    const involvementWhere = {
      OR: [
        { requestedById: userId },
        ...(userApprovalRoles.length > 0
          ? [
              {
                steps: {
                  some: {
                    role: { in: userApprovalRoles },
                  },
                },
              },
            ]
          : []),
      ],
    };

    const where = {
      AND: [involvementWhere, filterWhere],
    };

    const queryBase = {
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder } as any,
    };

    const [data, total] = await Promise.all([
      prisma.approval.findMany({
        ...queryBase,
        ...(select ? { select } : { include: include ?? APPROVAL_INCLUDE }),
      } as any),
      prisma.approval.count({ where }),
    ]);
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async isUserInvolved(
    approvalId: string,
    userId: string,
    userApprovalRoles: ApprovalRole[]
  ): Promise<boolean> {
    const approval = await prisma.approval.findFirst({
      where: {
        id: approvalId,
        OR: [
          { requestedById: userId },
          ...(userApprovalRoles.length > 0
            ? [
                {
                  steps: {
                    some: {
                      role: { in: userApprovalRoles },
                    },
                  },
                },
              ]
            : []),
        ],
      },
    });

    return approval !== null;
  }
}
