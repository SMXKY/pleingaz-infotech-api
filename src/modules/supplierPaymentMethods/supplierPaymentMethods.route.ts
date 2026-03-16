import { Router } from "express";
import { SupplierPaymentMethodController } from "./supplierPaymentMethods.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermiisons.data";

const supplierPaymentMethodRouter = Router();
const controller = new SupplierPaymentMethodController();

supplierPaymentMethodRouter.use(protect, getUserLanguage);

supplierPaymentMethodRouter.get(
  "/:supplierId",
  restrictTo(allPermissions.suppliers.readSupplier),
  controller.listPaymentMethods
);

supplierPaymentMethodRouter.post(
  "/:supplierId",
  restrictTo(allPermissions.suppliers.updateSupplier),
  controller.addPaymentMethod
);

supplierPaymentMethodRouter.patch(
  "/:supplierId/:methodId",
  restrictTo(allPermissions.suppliers.updateSupplier),
  controller.updatePaymentMethod
);

supplierPaymentMethodRouter.patch(
  "/:supplierId/:methodId/set-default",
  restrictTo(allPermissions.suppliers.updateSupplier),
  controller.setDefault
);

supplierPaymentMethodRouter.delete(
  "/:supplierId/:methodId",
  restrictTo(allPermissions.suppliers.deleteSupplier),
  controller.deletePaymentMethod
);

export default supplierPaymentMethodRouter;
