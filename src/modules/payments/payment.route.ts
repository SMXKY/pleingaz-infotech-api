import { Router } from "express";
import { PaymentController } from "./payment.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermiisons.data";

const paymentRouter = Router();
const controller = new PaymentController();

paymentRouter.use(protect, getUserLanguage);

paymentRouter.post(
  "/record",
  restrictTo(allPermissions.payments.recordPayment),
  controller.recordPayment
);

paymentRouter.get(
  "/by-order/:orderId/:refTable",
  restrictTo(allPermissions.payments.readPayment),
  controller.getByOrder
);

paymentRouter.get(
  "/:paymentId",
  restrictTo(allPermissions.payments.readPayment),
  controller.getById
);

paymentRouter.patch(
  "/:paymentId/notes",
  restrictTo(allPermissions.payments.updatePaymentNotes),
  controller.updateNotes
);

paymentRouter.post(
  "/:paymentId/reverse",
  restrictTo(allPermissions.payments.reversePayment),
  controller.reversePayment
);

paymentRouter.post(
  "/:paymentId/correct",
  restrictTo(allPermissions.payments.correctPayment),
  controller.correctPayment
);

export default paymentRouter;
