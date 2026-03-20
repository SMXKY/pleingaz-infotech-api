import { Approval } from "src/generated/prisma";
import prisma from "@models/index.model";

export class ApprovalRepository {
  // Find approval by record ID and entity type
  async findByRecord(
    recordId: string,
    entityType: string
  ): Promise<Approval | null> {
    return prisma.approval.findFirst({
      where: { recordId, entityType: entityType as any },
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
  }

  // Find approval by ID with steps
  async findById(id: string): Promise<Approval | null> {
    return prisma.approval.findUnique({
      where: { id },
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
  }

  // Find all approvals for a given entity type
  async findManyByEntityType(entityType: string): Promise<Approval[]> {
    return prisma.approval.findMany({
      where: { entityType: entityType as any },
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
      orderBy: { createdAt: "desc" },
    });
  }
}
