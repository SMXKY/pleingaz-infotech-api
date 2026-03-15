import { Router } from "express";
import { FinanceSettingsController } from "./financeSettings.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import { allPermissions } from "src/data/allPermiisons.data";

const financeSettingsRouter = Router();
const controller = new FinanceSettingsController();

financeSettingsRouter.use(protect, getUserLanguage);

financeSettingsRouter.get(
  "/",
  restrictTo(allPermissions.financeSettings.readFinanceSettings),
  controller.findMany
);
financeSettingsRouter.get(
  "/:id",
  restrictTo(allPermissions.financeSettings.readFinanceSettings),
  controller.findById
);
financeSettingsRouter.patch(
  "/:id",
  restrictTo(allPermissions.financeSettings.updateFinanceSettings),
  controller.update
);

export default financeSettingsRouter;
