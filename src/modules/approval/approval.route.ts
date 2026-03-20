import { Router } from "express";
import { ApprovalController } from "./approval.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermiisons.data";

const approvalRouter = Router();
const controller = new ApprovalController();

approvalRouter.use(protect, getUserLanguage);

// Get approval by record ID and entity type
// GET /approvals/by-record?recordId=xxx&entityType=GAS_ORDER
approvalRouter.get(
  "/by-record",
  restrictTo(allPermissions.approvals.readApproval),
  controller.getApprovalByRecord
);

// Get approval by ID
approvalRouter.get(
  "/:id",
  restrictTo(allPermissions.approvals.readApproval),
  controller.getApproval
);

// Approve or reject by record ID (e.g., gas purchase order ID)
// POST /approvals/:id/decide { action: "APPROVED" | "REJECTED", notes?: string }
approvalRouter.post(
  "/:id/decide",
  restrictTo(allPermissions.approvals.decideApproval),
  controller.approveOrReject
);

export default approvalRouter;
