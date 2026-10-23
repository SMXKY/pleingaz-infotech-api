import { Router } from "express";
import { GasBottlePurchaseOrderController } from "./gasBottlePurchaseOrders.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermissions.data";

const gasBottlePurchaseOrderRouter = Router();
const controller = new GasBottlePurchaseOrderController();

gasBottlePurchaseOrderRouter.use(protect, getUserLanguage);

gasBottlePurchaseOrderRouter.post(
  "/",
  restrictTo(allPermissions.gasBottlePurchaseOrders.createOrder),
  controller.createOrder
);

gasBottlePurchaseOrderRouter.get(
  "/",
  restrictTo(allPermissions.gasBottlePurchaseOrders.readAllOrders),
  controller.findMany
);

gasBottlePurchaseOrderRouter.get(
  "/:id/summary",
  restrictTo(allPermissions.gasBottlePurchaseOrders.readOrder),
  controller.getOrderSummary
);

gasBottlePurchaseOrderRouter.get(
  "/:id",
  restrictTo(allPermissions.gasBottlePurchaseOrders.readOrder),
  controller.findById
);

gasBottlePurchaseOrderRouter.patch(
  "/:id",
  restrictTo(allPermissions.gasBottlePurchaseOrders.updateOrder),
  controller.update
);

gasBottlePurchaseOrderRouter.delete(
  "/:id",
  restrictTo(allPermissions.gasBottlePurchaseOrders.deleteOrder),
  controller.delete
);

gasBottlePurchaseOrderRouter.post("/:id/cancel", controller.cancelOrder);

export default gasBottlePurchaseOrderRouter;
