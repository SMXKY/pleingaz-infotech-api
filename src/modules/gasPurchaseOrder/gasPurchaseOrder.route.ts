import { Router } from "express";
import { GasPurchaseOrderController } from "./gasPurchaseOrder.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermiisons.data";

const gasPurchaseOrderRouter = Router();
const controller = new GasPurchaseOrderController();

gasPurchaseOrderRouter.use(protect, getUserLanguage);

// Step 1: Create draft order
gasPurchaseOrderRouter.post(
  "/",
  restrictTo(allPermissions.gasPurchaseOrders.createOrder),
  controller.createDraft
);

// List all orders
gasPurchaseOrderRouter.get(
  "/",
  restrictTo(allPermissions.gasPurchaseOrders.readAllOrders),
  controller.findMany
);

// Step 4: Get full order summary
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

// Step 2: Assign tankers
gasPurchaseOrderRouter.patch(
  "/:id/tankers",
  restrictTo(allPermissions.gasPurchaseOrders.updateOrder),
  controller.assignTankers
);

// Step 3: Add line items + supplier
gasPurchaseOrderRouter.post(
  "/:id/line-items",
  restrictTo(allPermissions.gasPurchaseOrders.updateOrder),
  controller.addLineItems
);

// Submit for approval
gasPurchaseOrderRouter.post(
  "/:id/submit",
  restrictTo(allPermissions.gasPurchaseOrders.submitOrder),
  controller.submitForApproval
);

// Approve or reject
gasPurchaseOrderRouter.post(
  "/:id/approve",
  restrictTo(allPermissions.gasPurchaseOrders.approveOrder),
  controller.approveOrReject
);

// Update order (general fields)
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
