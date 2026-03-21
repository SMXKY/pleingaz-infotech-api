import { Router } from "express";
import { GasPurchaseOrderController } from "./gasPurchaseOrder.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermiisons.data";

const gasPurchaseOrderRouter = Router();
const controller = new GasPurchaseOrderController();

gasPurchaseOrderRouter.use(protect, getUserLanguage);

gasPurchaseOrderRouter.post(
  "/",
  restrictTo(allPermissions.gasPurchaseOrders.createOrder),
  controller.createOrder
);

gasPurchaseOrderRouter.get(
  "/",
  restrictTo(allPermissions.gasPurchaseOrders.readAllOrders),
  controller.findMany
);

gasPurchaseOrderRouter.get(
  "/:id/summary",
  restrictTo(allPermissions.gasPurchaseOrders.readOrder),
  controller.getOrderSummary
);

gasPurchaseOrderRouter.get(
  "/:id",
  restrictTo(allPermissions.gasPurchaseOrders.readOrder),
  controller.findById
);

gasPurchaseOrderRouter.patch(
  "/:id",
  restrictTo(allPermissions.gasPurchaseOrders.updateOrder),
  controller.update
);

gasPurchaseOrderRouter.delete(
  "/:id",
  restrictTo(allPermissions.gasPurchaseOrders.deleteOrder),
  controller.delete
);

gasPurchaseOrderRouter.post("/:id/cancel", controller.cancelOrder);

export default gasPurchaseOrderRouter;
