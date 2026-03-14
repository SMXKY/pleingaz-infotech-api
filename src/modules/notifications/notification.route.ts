import { Router } from "express";
import { NotificationController } from "./notification.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";

const notificationRouter = Router();
const controller = new NotificationController();

notificationRouter.use(protect, getUserLanguage);

notificationRouter.get("/", controller.findMany);
notificationRouter.get("/unread-count", controller.unReadCount);
notificationRouter.patch("/read-all", controller.markAllAsRead);

notificationRouter.get("/:id", controller.findById);
notificationRouter.patch("/:id/read", controller.markOneAsRead);
notificationRouter.delete("/:id", controller.delete);

export default notificationRouter;
