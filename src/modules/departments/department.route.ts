import { Router } from "express";
import { DepartmentController } from "./department.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermissions.data";

const departmentRouter = Router();
const controller = new DepartmentController();

departmentRouter.use(protect, getUserLanguage);

departmentRouter
  .route("/")
  .get(
    restrictTo(allPermissions.departments.readAllDepartments),
    controller.findMany
  )
  .post(
    restrictTo(allPermissions.departments.createDepartment),
    controller.create
  );

departmentRouter
  .route("/active")
  .get(
    restrictTo(allPermissions.departments.readAllDepartments),
    controller.findActive
  );
departmentRouter
  .route("/:id/restore")
  .patch(
    restrictTo(allPermissions.departments.restoreDepartment),
    controller.restore
  );

departmentRouter
  .route("/deleted")
  .get(
    restrictTo(allPermissions.departments.restoreDepartment),
    controller.findDeleted
  );

departmentRouter
  .route("/:id")
  .get(
    restrictTo(allPermissions.departments.readDepartment),
    controller.findById
  )
  .patch(
    restrictTo(allPermissions.departments.updateDepartment),
    controller.update
  )
  .delete(
    restrictTo(allPermissions.departments.deleteDepartment),
    controller.delete
  );

export default departmentRouter;
