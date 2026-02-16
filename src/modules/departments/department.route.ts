import { Router } from "express";
import { DepartmentController } from "./department.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";

const departmentRouter = Router();
const controller = new DepartmentController();

departmentRouter.use(getUserLanguage);

departmentRouter.route("/").get(controller.findMany).post(controller.create);

departmentRouter.route("/active").get(controller.findActive);
departmentRouter.route("/:id/restore").get(controller.restore);

departmentRouter
  .route("/:id")
  .get(controller.findById)
  .patch(controller.update)
  .delete(controller.delete);

export default departmentRouter;
