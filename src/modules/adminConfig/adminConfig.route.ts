import { Router } from "express";
import { AdminConfigController } from "./adminConfig.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import { allPermissions } from "src/data/allPermissions.data";

const adminConfigRouter = Router();
const controller = new AdminConfigController();

adminConfigRouter.use(protect, getUserLanguage);

adminConfigRouter.get(
  "/",
  restrictTo(allPermissions.adminConfigs.readAdminConfig),
  controller.findMany
);
adminConfigRouter.get(
  "/:id",
  restrictTo(allPermissions.adminConfigs.readAdminConfig),
  controller.findById
);
adminConfigRouter.patch(
  "/:id",
  restrictTo(allPermissions.adminConfigs.updateAdminConfig),
  controller.update
);

export default adminConfigRouter;
