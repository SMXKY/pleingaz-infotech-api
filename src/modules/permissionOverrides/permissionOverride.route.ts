import { Router } from "express";
import { PermissionOverrideController } from "./permissionOverride.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermiisons.data";

const permissionRouter = Router();
const controller = new PermissionOverrideController();

permissionRouter.use(protect, getUserLanguage);

permissionRouter.get(
  "/",
  restrictTo(allPermissions.permissionOverrides.readAllPermissionOverrides),
  controller.findMany
);

permissionRouter.get(
  "/:id",
  restrictTo(allPermissions.permissionOverrides.readPermissionOverride),
  controller.findById
);

export default permissionRouter;
