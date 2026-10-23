import { Router } from "express";
import { OrderEmailController } from "./supplierEmail.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermissions.data";

const orderEmailRouter = Router();
const controller = new OrderEmailController();

orderEmailRouter.use(protect, getUserLanguage);

orderEmailRouter.post(
  "/",
  restrictTo(allPermissions.exploitationOrderEmails.sendEmail),
  controller.createOrderEmail
);
orderEmailRouter.get(
  "/",
  restrictTo(allPermissions.exploitationOrderEmails.readAllEmails),
  controller.findMany
);
orderEmailRouter.get(
  "/:id",
  restrictTo(allPermissions.exploitationOrderEmails.readOneEmail),
  controller.findById
);

export default orderEmailRouter;
