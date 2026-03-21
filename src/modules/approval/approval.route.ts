import { Router } from "express";
import { ApprovalController } from "./approval.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";

const approvalRouter = Router();
const controller = new ApprovalController();

approvalRouter.use(protect, getUserLanguage);

approvalRouter.get("/", controller.getMyApprovals);

approvalRouter.get("/by-record", controller.getApprovalByRecord);

approvalRouter.get("/:id", controller.getApproval);

approvalRouter.post("/:id/decide", controller.approveOrReject);

export default approvalRouter;
