import { Router } from "express";
import { AccessoryCategoryController } from "./accessoryCategory.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermissions.data";

const accessoryCategoryRouter = Router();
const controller = new AccessoryCategoryController();

accessoryCategoryRouter.use(protect, getUserLanguage);

accessoryCategoryRouter.get(
  "/",
  restrictTo(allPermissions.accessoryCategories.readAllAccessoryCategories),
  controller.findMany
);

export default accessoryCategoryRouter;
