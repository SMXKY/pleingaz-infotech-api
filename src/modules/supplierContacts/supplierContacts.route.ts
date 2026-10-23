import { Router } from "express";
import { SupplierContactController } from "./supplierContacts.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermissions.data";

const supplierContactRouter = Router();
const controller = new SupplierContactController();

supplierContactRouter.use(protect, getUserLanguage);

supplierContactRouter.get(
  "/:supplierId",
  restrictTo(allPermissions.suppliers.readSupplier),
  controller.listContacts
);

supplierContactRouter.post(
  "/:supplierId",
  restrictTo(allPermissions.suppliers.updateSupplier),
  controller.addContact
);

supplierContactRouter.patch(
  "/:supplierId/:contactId",
  restrictTo(allPermissions.suppliers.updateSupplier),
  controller.updateContact
);

supplierContactRouter.patch(
  "/:supplierId/:contactId/set-primary",
  restrictTo(allPermissions.suppliers.updateSupplier),
  controller.setPrimary
);

supplierContactRouter.delete(
  "/:supplierId/:contactId",
  restrictTo(allPermissions.suppliers.deleteSupplier),
  controller.deleteContact
);

export default supplierContactRouter;
