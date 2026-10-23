import { Router } from "express";
import { GasBottleTypeController } from "./gasBottleType.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermissions.data";

const gasBottleTypeRouter = Router();
const controller = new GasBottleTypeController();

gasBottleTypeRouter.use(protect, getUserLanguage);

gasBottleTypeRouter.get(
  "/",
  restrictTo(allPermissions.gasBottleTypes.readAllBottleTypes),
  controller.findMany
);

gasBottleTypeRouter.get(
  "/:id",
  restrictTo(allPermissions.gasBottleTypes.readBottleType),
  controller.findById
);

gasBottleTypeRouter.patch(
  "/:id",
  restrictTo(allPermissions.gasBottleTypes.updateBottleType),
  controller.update
);

export default gasBottleTypeRouter;
