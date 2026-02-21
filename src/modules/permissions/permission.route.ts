import { Router } from "express";
import { PermissionController } from "./permission.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermiisons.data";

const permissionRouter = Router();
const controller = new PermissionController();

permissionRouter.use(protect, getUserLanguage);

permissionRouter.get(
  "/",
  restrictTo(allPermissions.permissions.readpermission),
  controller.findMany
);
permissionRouter.get(
  "/wild",
  restrictTo(allPermissions.permissions.readAllpermissions),
  controller.findWildCards
);
permissionRouter.get(
  "/:id",
  restrictTo(allPermissions.permissions.readAllpermissions),
  controller.findById
);

export default permissionRouter;
