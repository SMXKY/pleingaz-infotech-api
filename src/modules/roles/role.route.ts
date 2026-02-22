import { Router } from "express";
import { RoleController } from "./role.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermiisons.data";

const roleRouter = Router();
const controller = new RoleController();

roleRouter.use(protect, getUserLanguage);

roleRouter.patch(
  "/disable/:id",
  restrictTo(allPermissions.roles.disableRole),
  controller.disableRole
);
roleRouter.patch(
  "/enable/:id",
  restrictTo(allPermissions.roles.enableRole),
  controller.enableRole
);
roleRouter.post(
  "/assign-permissions",
  restrictTo(allPermissions.roles.assignPermissions),
  controller.assignRolePermissions
);

roleRouter.post(
  "/override",
  restrictTo(allPermissions.roles.createRoleOverride),
  controller.roleOverride
);

roleRouter.patch(
  "/revoke-override",
  restrictTo(allPermissions.roles.revokeRoleOverride),
  controller.revokeRoleOverride
);

roleRouter.get(
  "/active",
  restrictTo(allPermissions.roles.readAllRoles),
  controller.findActive
);
roleRouter.get(
  "/:id/permissions",
  restrictTo(allPermissions.roles.readAllRoles),
  controller.findWithPermissions
);
roleRouter.get(
  "/",
  restrictTo(allPermissions.roles.readAllRoles),
  controller.findMany
);
roleRouter.get(
  "/:id",
  restrictTo(allPermissions.roles.readRole),
  controller.findById
);
roleRouter.post(
  "/",
  restrictTo(allPermissions.roles.createRole),
  controller.create
);
roleRouter.patch(
  "/:id",
  restrictTo(allPermissions.roles.updateRole),
  controller.update
);
roleRouter.delete(
  "/:id",
  restrictTo(allPermissions.roles.deleteRole),
  controller.delete
);
roleRouter.patch(
  "/:id/restore",
  restrictTo(allPermissions.roles.restoreRole),
  controller.restore
);
roleRouter.get(
  "/:id/restore",
  restrictTo(allPermissions.roles.restoreRole),
  controller.findDeleted
);

export default roleRouter;
