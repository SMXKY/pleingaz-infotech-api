import { Router } from "express";
import { SupplierController } from "./supplier.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermiisons.data";

const supplierRouter = Router();
const controller = new SupplierController();

supplierRouter.use(protect, getUserLanguage);

supplierRouter.get(
  "/:id/orders",
  restrictTo(allPermissions.suppliers.readAllSuppliers),
  controller.findWithOrders
);

supplierRouter.get(
  "/",
  restrictTo(allPermissions.suppliers.readAllSuppliers),
  controller.findMany
);
supplierRouter.get(
  "/:id",
  restrictTo(allPermissions.suppliers.readSupplier),
  controller.findById
);
supplierRouter.post(
  "/",
  restrictTo(allPermissions.suppliers.createSupplier),
  controller.createSupplier
);
supplierRouter.patch(
  "/:id",
  restrictTo(allPermissions.suppliers.updateSupplier),
  controller.update
);
supplierRouter.delete(
  "/:id",
  restrictTo(allPermissions.suppliers.deleteSupplier),
  controller.delete
);

export default supplierRouter;
