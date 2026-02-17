import { Router } from "express";
import { UserController } from "./user.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";

const userRouter = Router();
const controller = new UserController();

userRouter.use(getUserLanguage);

userRouter.route("/").get(controller.findMany).post(controller.create);

userRouter.route("/active").get(controller.findActive);
userRouter.route("/terminated").get(controller.findTerminatedUsers);
userRouter.route("/:username").get(controller.findByUserName);
userRouter.route("/:id/restore").get(controller.restore);

userRouter
  .route("/:id")
  .get(controller.findById)
  .patch(controller.update)
  .delete(controller.delete);

export default userRouter;
