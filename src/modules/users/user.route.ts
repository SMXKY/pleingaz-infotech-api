import { Router } from "express";
import { UserController } from "./user.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";

const userRouter = Router();
const controller = new UserController();

userRouter.post("/login", getUserLanguage, controller.login);
userRouter.post("/forgot-password", getUserLanguage, controller.forgotPassword);
userRouter.post("/reset-password", getUserLanguage, controller.resetPassword);
userRouter.use(getUserLanguage, protect);

userRouter.route("/").get(controller.findMany).post(controller.createEmployee);

userRouter.route("/me").get(controller.findMe);

userRouter.patch("/change-role", controller.changeRole);
userRouter.patch("/activate/:userId", controller.activateAccount);
userRouter.patch("/terminate/:userId", controller.terminateAccount);
userRouter.patch("/change-password", controller.changePassword);
userRouter.patch("/change-credentials", controller.changeUserCredentials);

userRouter.post("/resend-invite/:userId", controller.createSetupToken);
userRouter.post("/setup-account", controller.setupAccountCredentials);
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
