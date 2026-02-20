import { Router } from "express";
import { UserController } from "./user.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import multer from "multer";
import { handleFilesMiddleware } from "@middlewares/handleFiles.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermiisons.data";

const userRouter = Router();
const controller = new UserController();
const upload = multer({ dest: "../../upload" });

userRouter.post("/login", getUserLanguage, controller.login);
userRouter.post("/forgot-password", getUserLanguage, controller.forgotPassword);
userRouter.post("/reset-password", getUserLanguage, controller.resetPassword);
userRouter.use(protect, getUserLanguage);

userRouter
  .route("/")
  .get(controller.findMany)
  .post(restrictTo(allPermissions.users.createUser), controller.createEmployee);

userRouter.route("/me").get(controller.findMe).patch(controller.updateMe);
userRouter
  .route("/me/profile-picture")
  .patch(
    upload.array("img", 1),
    handleFilesMiddleware,
    controller.changeMyProfilePicture
  );

userRouter.patch("/change-role", controller.changeRole);
userRouter.patch("/activate/:userId", controller.activateAccount);
userRouter.patch("/terminate/:userId", controller.terminateAccount);
userRouter.patch("/change-password", controller.changePassword);
userRouter.patch("/change-credentials", controller.changeUserCredentials);

userRouter.post("/resend-invite/:userId", controller.createSetupToken);
userRouter.post("/setup-account", controller.setupAccountCredentials);
userRouter.route("/active").get(controller.findActive);
userRouter.route("/terminated").get(controller.findTerminatedUsers);

userRouter
  .route("/:id")
  .get(controller.findById)
  .patch(controller.update)
  .delete(controller.delete);
userRouter.route("/:username").get(controller.findByUserName);
userRouter.route("/:id/restore").get(controller.restore);

export default userRouter;
