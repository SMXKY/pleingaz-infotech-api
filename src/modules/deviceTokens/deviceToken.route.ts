// deviceToken.routes.ts
import { Router } from "express";
import { DeviceTokenController } from "./deviceToken.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";

const deviceTokenRouter = Router();
const controller = new DeviceTokenController();

deviceTokenRouter.use(protect, getUserLanguage);

deviceTokenRouter.post("/", controller.register);
deviceTokenRouter.get("/", controller.getMyTokens);
deviceTokenRouter.delete("/all", controller.removeAll);
deviceTokenRouter.delete("/:token", controller.remove);

export default deviceTokenRouter;
