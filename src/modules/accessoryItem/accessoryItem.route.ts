import { Router } from "express";
import { AccessoryItemController } from "./accessoryItem.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermissions.data";

const accessoryItemRouter = Router();
const controller = new AccessoryItemController();

accessoryItemRouter.use(protect, getUserLanguage);

accessoryItemRouter.get(
  "/",
  restrictTo(allPermissions.accessoryItems.readAllAccessoryItems),
  controller.findMany
);

accessoryItemRouter.get(
  "/:id",
  restrictTo(allPermissions.accessoryItems.readAccessoryItem),
  controller.findById
);

accessoryItemRouter.post(
  "/",
  restrictTo(allPermissions.accessoryItems.createAccessoryItem),
  controller.create
);

accessoryItemRouter.patch(
  "/:id",
  restrictTo(allPermissions.accessoryItems.updateAccessoryItem),
  controller.update
);

accessoryItemRouter.delete(
  "/:id",
  restrictTo(allPermissions.accessoryItems.deleteAccessoryItem),
  controller.delete
);

export default accessoryItemRouter;
