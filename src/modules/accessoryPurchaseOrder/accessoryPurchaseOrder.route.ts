import { Router } from "express";
import { AccessoryPurchaseOrderController } from "./accessoryPurchaseOrder.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermiisons.data";

const accessoryPurchaseOrderRouter = Router();
const controller = new AccessoryPurchaseOrderController();

accessoryPurchaseOrderRouter.use(protect, getUserLanguage);

accessoryPurchaseOrderRouter.post(
  "/",
  restrictTo(allPermissions.gasBottlePurchaseOrders.createOrder),
  controller.createOrder
);

accessoryPurchaseOrderRouter.get(
  "/",
  restrictTo(allPermissions.gasBottlePurchaseOrders.readAllOrders),
  controller.findMany
);

accessoryPurchaseOrderRouter.get(
  "/:id/summary",
  restrictTo(allPermissions.gasBottlePurchaseOrders.readOrder),
  controller.getOrderSummary
);

accessoryPurchaseOrderRouter.get(
  "/:id",
  restrictTo(allPermissions.gasBottlePurchaseOrders.readOrder),
  controller.findById
);

accessoryPurchaseOrderRouter.patch(
  "/:id",
  restrictTo(allPermissions.gasBottlePurchaseOrders.updateOrder),
  controller.update
);

accessoryPurchaseOrderRouter.delete(
  "/:id",
  restrictTo(allPermissions.gasBottlePurchaseOrders.deleteOrder),
  controller.delete
);

accessoryPurchaseOrderRouter.post("/:id/cancel", controller.cancelOrder);

export default accessoryPurchaseOrderRouter;
