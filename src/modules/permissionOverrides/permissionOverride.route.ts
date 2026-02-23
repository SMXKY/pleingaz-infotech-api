import { Router } from "express";
import { PermissionOverrideController } from "./permissionOverride.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissionOverrides from "src/data/allPermiisons.data";

const permissionOverrideRouter = Router();
const controller = new PermissionOverrideController();

permissionOverrideRouter.use(protect, getUserLanguage);

permissionOverrideRouter.get(
  "/",
  restrictTo(
    allPermissionOverrides.permissionOverrides.readAllPermissionOverrides
  ),
  controller.findMany
);

permissionOverrideRouter.get(
  "/:id",
  restrictTo(allPermissionOverrides.permissionOverrides.readPermissionOverride),
  controller.findById
);

export default permissionOverrideRouter;
