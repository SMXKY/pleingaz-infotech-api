import { Router } from "express";
import { UserController } from "./user.controller";
import getUserLanguage from "@middlewares/getUserLanguage.middleware";
import protect from "@middlewares/protect.middleware";
import multer from "multer";
import { handleFilesMiddleware } from "@middlewares/handleFiles.middleware";
import restrictTo from "@middlewares/restrictTo.middleware";
import allPermissions from "src/data/allPermissions.data";

const userRouter = Router();
const controller = new UserController();
const upload = multer({ dest: "../../upload" });

userRouter.post("/login", getUserLanguage, controller.login);
userRouter
  .route("/forgot-password")
  .post(getUserLanguage, controller.forgotPassword);
userRouter
  .route("/reset-password")
  .post(getUserLanguage, controller.resetPassword);
userRouter
  .route("/setup-account")
  .post(getUserLanguage, controller.setupAccountCredentials);

userRouter.use(protect, getUserLanguage);

userRouter
  .route("/")
  .get(restrictTo(allPermissions.users.readAllUsers), controller.findMany)
  .post(restrictTo(allPermissions.users.createUser), controller.createEmployee);

userRouter.route("/me").get(controller.findMe).patch(controller.updateMe);
userRouter
  .route("/me/profile-picture")
  .patch(
    upload.array("img", 1),
    handleFilesMiddleware,
    controller.changeMyProfilePicture
  );
userRouter.patch("/change-password", controller.changePassword);

userRouter
  .route("/active")
  .get(restrictTo(allPermissions.users.readAllUsers), controller.findActive);
userRouter
  .route("/terminated")
  .get(
    restrictTo(allPermissions.users.readAllUsers),
    controller.findTerminatedUsers
  );
userRouter.patch(
  "/change-role",
  restrictTo(allPermissions.users.changeUserRole),
  controller.changeRole
);
userRouter.patch(
  "/change-department",
  restrictTo(allPermissions.users.changeUserDepartment),
  controller.changeUserDepartment
);
userRouter.patch(
  "/activate/:userId",
  restrictTo(allPermissions.users.activateUser),
  controller.activateAccount
);
userRouter.patch(
  "/terminate/:userId",
  restrictTo(allPermissions.users.terminateUser),
  controller.terminateAccount
);
userRouter.patch(
  "/change-credentials",
  restrictTo(allPermissions.users.changeUserCredentials),
  controller.changeUserCredentials
);
userRouter.post(
  "/deactivate",
  restrictTo(allPermissions.users.deactivateUser),
  controller.temporarilyDeactivateAccount
);
userRouter.patch(
  "/reactivate/:id",
  restrictTo(allPermissions.users.reactivateUser),
  controller.reactivateAccount
);
userRouter.post(
  "/resend-invite/:userId",
  restrictTo(allPermissions.users.resendUserInvite),
  controller.createSetupToken
);

userRouter.get("/payroll/me", controller.getMyPayrollData);

userRouter.get(
  "/payroll/:id",
  restrictTo(allPermissions.users.readUserPayroll),
  controller.getUserPayrollData
);

userRouter.get(
  "/payroll",
  restrictTo(allPermissions.users.readAllUsersPayroll),
  controller.getAllUserPayrollData
);

userRouter.patch(
  "/payroll",
  restrictTo(allPermissions.users.updateUserPayroll),
  controller.updateUserPayrollData
);

userRouter.patch(
  "/suspend",
  restrictTo(allPermissions.users.revokeUserRole),
  controller.revokeUserRole
);
userRouter.patch(
  "/reinstate/:id",
  restrictTo(allPermissions.users.reinstateUser),
  controller.reinstateUser
);

userRouter
  .route("/:id")
  .get(restrictTo(allPermissions.users.readUser), controller.findById)
  .patch(restrictTo(allPermissions.users.updateUser), controller.update)
  .delete(restrictTo(allPermissions.users.deleteUser), controller.delete);
userRouter
  .route("/:username")
  .get(restrictTo(allPermissions.users.readUser), controller.findByUserName);
userRouter
  .route("/:id/restore")
  .patch(restrictTo(allPermissions.users.restoreUser), controller.restore);
userRouter
  .route("/:id/restore")
  .get(restrictTo(allPermissions.users.restoreUser), controller.findDeleted);

export default userRouter;
