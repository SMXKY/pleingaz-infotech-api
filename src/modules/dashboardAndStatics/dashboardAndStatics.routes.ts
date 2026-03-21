import { Router } from "express";
import { dashboardAndAnalyticsController } from "./dashboardAndStatics.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermiisons.data";

const dashboardAndAnalyticsRouter = Router();

dashboardAndAnalyticsRouter.use(protect, getUserLanguage);

dashboardAndAnalyticsRouter
  .route("/gas-purchase")
  .get(
    restrictTo(allPermissions.dashboardAnalytics.readGasPurchaseDashboard),
    dashboardAndAnalyticsController.gasPurchaseDashboard
  );

dashboardAndAnalyticsRouter
  .route("/gas-purchase/statistics")
  .get(
    restrictTo(allPermissions.dashboardAnalytics.readGasPurchaseStatistics),
    dashboardAndAnalyticsController.gasPurchaseStatistics
  );

dashboardAndAnalyticsRouter
  .route("/bottle-purchase")
  .get(
    restrictTo(allPermissions.dashboardAnalytics.readBottlePurchaseDashboard),
    dashboardAndAnalyticsController.bottleDashboard
  );

dashboardAndAnalyticsRouter
  .route("/accessory-purchase")
  .get(
    restrictTo(
      allPermissions.dashboardAnalytics.readAccessoryPurchaseDashboard
    ),
    dashboardAndAnalyticsController.accessoryDashboard
  );

export default dashboardAndAnalyticsRouter;
