import { Router } from "express";
import { SupplierCommercialTermsController } from "./supplierCormercialTerms.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermiisons.data";

const supplierCommercialTermsRouter = Router();
const controller = new SupplierCommercialTermsController();

supplierCommercialTermsRouter.use(protect, getUserLanguage);

supplierCommercialTermsRouter.get(
  "/:supplierId",
  restrictTo(allPermissions.suppliers.readSupplier),
  controller.getCommercialTerms
);

supplierCommercialTermsRouter.patch(
  "/:supplierId",
  restrictTo(allPermissions.suppliers.updateSupplier),
  controller.updateCommercialTerms
);

export default supplierCommercialTermsRouter;
