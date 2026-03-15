import { Router } from "express";
import { ExchangeRateController } from "./exchangeRates.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";

const exchangeRateRouter = Router();
const controller = new ExchangeRateController();

exchangeRateRouter.use(protect, getUserLanguage);

exchangeRateRouter
  .route("/")
  .get(controller.findMany)
  .post(controller.convertCurrency);

export default exchangeRateRouter;
