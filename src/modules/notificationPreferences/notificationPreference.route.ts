import { Router } from "express";
import { NotificationPreferencesController } from "./notificationPreference.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";

const notificationPreferencesRouter = Router();
const controller = new NotificationPreferencesController();

notificationPreferencesRouter.use(protect, getUserLanguage);

notificationPreferencesRouter.get("/", controller.get);
notificationPreferencesRouter.patch("/", controller.update);
notificationPreferencesRouter.post("/reset", controller.reset);

export default notificationPreferencesRouter;
