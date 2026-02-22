import { Router } from "express";
import { RolePermissionController } from "./rolePermission.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermiisons.data";

const RolePermissionRouter = Router();
const controller = new RolePermissionController();

RolePermissionRouter.use(protect, getUserLanguage);

RolePermissionRouter.get(
  "/",
  restrictTo(allPermissions.permissionOverrides.readAllPermissionOverrides),
  controller.findMany
);

RolePermissionRouter.get(
  "/:id",
  restrictTo(allPermissions.permissionOverrides.readPermissionOverride),
  controller.findById
);

export default RolePermissionRouter;
