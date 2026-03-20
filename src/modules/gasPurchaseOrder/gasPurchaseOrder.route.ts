import { Router } from "express";
import { GasPurchaseOrderController } from "./gasPurchaseOrder.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermiisons.data";

const gasPurchaseOrderRouter = Router();
const controller = new GasPurchaseOrderController();

gasPurchaseOrderRouter.use(protect, getUserLanguage);

// Create full order (single request — depot, tankers, supplier, line items)
gasPurchaseOrderRouter.post(
  "/",
  restrictTo(allPermissions.gasPurchaseOrders.createOrder),
  controller.createOrder
);

// List all orders
gasPurchaseOrderRouter.get(
  "/",
  restrictTo(allPermissions.gasPurchaseOrders.readAllOrders),
  controller.findMany
);

// Get full order summary (with approval status)
gasPurchaseOrderRouter.get(
  "/:id/summary",
  restrictTo(allPermissions.gasPurchaseOrders.readOrder),
  controller.getOrderSummary
);

// Get single order
gasPurchaseOrderRouter.get(
  "/:id",
  restrictTo(allPermissions.gasPurchaseOrders.readOrder),
  controller.findById
);

// Update order (only while DRAFT)
gasPurchaseOrderRouter.patch(
  "/:id",
  restrictTo(allPermissions.gasPurchaseOrders.updateOrder),
  controller.update
);

// Delete order
gasPurchaseOrderRouter.delete(
  "/:id",
  restrictTo(allPermissions.gasPurchaseOrders.deleteOrder),
  controller.delete
);

export default gasPurchaseOrderRouter;
