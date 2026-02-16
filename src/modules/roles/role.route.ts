import { Router } from "express";
import { RoleController } from "./role.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";

const roleRouter = Router();
const controller = new RoleController();

roleRouter.use(getUserLanguage);

roleRouter.get("/active", controller.findActive);
roleRouter.get("/:id/permissions", controller.findWithPermissions);
roleRouter.get("/", controller.findMany);
roleRouter.get("/:id", controller.findById);
roleRouter.post("/", controller.create);
roleRouter.patch("/:id", controller.update);
roleRouter.delete("/:id", controller.delete);
roleRouter.post("/:id/restore", controller.restore);

export default roleRouter;
