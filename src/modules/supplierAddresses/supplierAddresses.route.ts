import { Router } from "express";
import { SupplierAddressController } from "./supplierAddresses.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermiisons.data";

const supplierAddressRouter = Router();
const controller = new SupplierAddressController();

supplierAddressRouter.use(protect, getUserLanguage);

supplierAddressRouter.get(
  "/:supplierId",
  restrictTo(allPermissions.suppliers.readSupplier),
  controller.listAddresses
);

supplierAddressRouter.post(
  "/:supplierId",
  restrictTo(allPermissions.suppliers.updateSupplier),
  controller.addAddress
);

supplierAddressRouter.patch(
  "/:supplierId/:addressId",
  restrictTo(allPermissions.suppliers.updateSupplier),
  controller.updateAddress
);

supplierAddressRouter.patch(
  "/:supplierId/:addressId/set-default",
  restrictTo(allPermissions.suppliers.updateSupplier),
  controller.setDefault
);

supplierAddressRouter.delete(
  "/:supplierId/:addressId",
  restrictTo(allPermissions.suppliers.deleteSupplier),
  controller.deleteAddress
);

export default supplierAddressRouter;
