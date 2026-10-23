import { Router } from "express";
import { ActivityLogController } from "./activityLogs.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allactivityLogs from "src/data/allPermissions.data";

const activityLogRouter = Router();
const controller = new ActivityLogController();

activityLogRouter.use(protect, getUserLanguage);

activityLogRouter.get(
  "/",
  restrictTo(allactivityLogs.activityLogs.readActivityLog),
  controller.findMany
);
activityLogRouter.get(
  "/:id",
  restrictTo(allactivityLogs.activityLogs.readAllActivityLogs),
  controller.findById
);

export default activityLogRouter;
