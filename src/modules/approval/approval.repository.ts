import { Approval, ApprovalRole } from "src/generated/prisma";
import prisma from "@models/index.model";
import { BaseRepository } from "src/base/BaseRepository";

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

  async findById(id: string): Promise<Approval | null> {
    return prisma.approval.findUnique({
      where: { id },
      include: APPROVAL_INCLUDE,
    });
  }

  async findByInvolvement(
    userId: string,
    userApprovalRoles: ApprovalRole[]
  ): Promise<Approval[]> {
    return prisma.approval.findMany({
      where: {
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
      include: APPROVAL_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
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
