import { createPrismaMock, PrismaMock } from "../helpers/prismaMock";

const mockPrisma: PrismaMock = createPrismaMock();

jest.mock("@models/index.model", () => ({
  __esModule: true,
  default: mockPrisma,
}));
jest.mock("@services/notification/notification.dispatcher", () => ({
  sendAndDispatch: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@utils/recalculateSupplierMetrics.util", () => ({
  recalculateSupplierMetrics: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@utils/logUserActivity.util", () => ({
  logUserActivity: jest.fn(),
}));

import { ApprovalService } from "src/modules/approval/approval.service";
import { sendAndDispatch } from "@services/notification/notification.dispatcher";

const ACCOUNTANT = "Comptable (Accountant)";
const CEO = "Directeur Général (CEO)";

const buildApproval = (overrides: Record<string, unknown> = {}) => ({
  id: "approval-1",
  entityType: "GAS_ORDER",
  recordId: "order-1",
  status: "PENDING",
  currentStep: 1,
  totalSteps: 2,
  requestedById: "requester-1",
  steps: [
    { step: 1, role: "ACCOUNTING", status: "PENDING" },
    { step: 2, role: "CEO", status: "PENDING" },
  ],
  ...overrides,
});

const givenApproval = (approval: ReturnType<typeof buildApproval>) =>
  mockPrisma.approval.findFirst.mockResolvedValue(approval);

const givenUserWithRole = (roleName: string) =>
  mockPrisma.user.findFirst.mockResolvedValue({
    id: "user-1",
    name: "Jane",
    surname: "Doe",
    role: { name: roleName },
  });

const ctx = { userId: "user-1", userEmail: "jane@test.local" };

describe("ApprovalService.approveOrReject", () => {
  let service: ApprovalService;

  beforeEach(() => {
    service = new ApprovalService();
    mockPrisma.gasPurchaseOrder.findUnique.mockResolvedValue({ id: "order-1" });
    mockPrisma.approval.findUnique.mockResolvedValue({ id: "approval-1" });
  });

  it("rejects an invalid action before touching the database", async () => {
    await expect(
      service.approveOrReject("approval-1", { action: "MAYBE" } as any, ctx)
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(mockPrisma.approval.findFirst).not.toHaveBeenCalled();
  });

  it("returns 404 when the approval does not exist", async () => {
    mockPrisma.approval.findFirst.mockResolvedValue(null);

    await expect(
      service.approveOrReject("missing", { action: "APPROVED" }, ctx)
    ).rejects.toMatchObject({
      statusCode: 404,
      messageKey: "error.approval.not_found",
    });
  });

  it("refuses to decide an approval that is no longer pending", async () => {
    givenApproval(buildApproval({ status: "APPROVED" }));

    await expect(
      service.approveOrReject("approval-1", { action: "APPROVED" }, ctx)
    ).rejects.toMatchObject({ messageKey: "error.approval.not_pending" });
  });

  it("forbids a user whose role does not match the current step", async () => {
    givenApproval(buildApproval());
    givenUserWithRole(CEO); // step 1 requires the accountant

    await expect(
      service.approveOrReject("approval-1", { action: "APPROVED" }, ctx)
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(mockPrisma.approvalStep.update).not.toHaveBeenCalled();
  });

  it("advances to the next step without approving the order", async () => {
    givenApproval(buildApproval());
    givenUserWithRole(ACCOUNTANT);

    await service.approveOrReject("approval-1", { action: "APPROVED" }, ctx);

    expect(mockPrisma.approvalStep.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { approvalId_step: { approvalId: "approval-1", step: 1 } },
        data: expect.objectContaining({
          status: "APPROVED",
          decidedById: "user-1",
        }),
      })
    );
    expect(mockPrisma.approval.update).toHaveBeenCalledWith({
      where: { id: "approval-1" },
      data: { currentStep: 2 },
    });
    expect(mockPrisma.gasPurchaseOrder.update).not.toHaveBeenCalled();
  });

  it("approves the order when the final step is approved", async () => {
    givenApproval(buildApproval({ currentStep: 2 }));
    givenUserWithRole(CEO);

    await service.approveOrReject("approval-1", { action: "APPROVED" }, ctx);

    expect(mockPrisma.approval.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "APPROVED" }),
      })
    );
    expect(mockPrisma.gasPurchaseOrder.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { status: "APPROVED" },
    });
    expect(sendAndDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "APPROVAL_APPROVED",
        target: { type: "user", userId: "requester-1" },
      })
    );
  });

  it("cancels the order when any step is rejected", async () => {
    givenApproval(buildApproval());
    givenUserWithRole(ACCOUNTANT);

    await service.approveOrReject(
      "approval-1",
      { action: "REJECTED", notes: "Price too high" },
      ctx
    );

    expect(mockPrisma.approval.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REJECTED" }),
      })
    );
    expect(mockPrisma.gasPurchaseOrder.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { status: "CANCELLED" },
    });
    expect(sendAndDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "APPROVAL_REJECTED" })
    );
  });
});
