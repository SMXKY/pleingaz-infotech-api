import express, { Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import { StatusCodes } from "http-status-codes";
import cookieParser from "cookie-parser";
import { globalErrorController } from "@controllers/error.controller";
import { AppError } from "@utils/AppError.util";
import { swaggerSpec } from "./docs/openapi";
import path from "path";

import cors, { CorsOptions } from "cors";
import { roleRouter } from "./modules/roles";
import { departmentRouter } from "./modules/departments";
import { userRouter } from "./modules/users";
import activityLogRouter from "./modules/activityLogs/activityLogs.route";
import adminConfigRouter from "./modules/adminConfig/adminConfig.route";
import { PermissionOverrideRouter } from "./modules/permissionOverrides/indext";
import { rolePermissionRouter } from "./modules/rolePermissions/indext";
import permissionRouter from "./modules/permissions/permission.route";
import { notificationRouter } from "./modules/notifications";
import { deviceTokenRouter } from "./modules/deviceTokens";
import notificationPreferencesRouter from "./modules/notificationPreferences/notificationPreference.route";
import financeSettingsRouter from "./modules/financeSettings/financeSettings.route";
import exchangeRateRouter from "./modules/exchangeRates/exchangeRates.route";
import { supplierRouter } from "./modules/suppliers";
import { supplierContactRouter } from "./modules/supplierContacts";
import { supplierAddressRouter } from "./modules/supplierAddresses";

export const app = express();

// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   next();
// });

const corsOptions: CorsOptions = {
  origin: true, // This allows all origins - simpler than the callback
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],
};
app.use(
  cors({
    origin: "*",
    credentials: false,
  })
);
// app.use(cookieParser());

app.set("trust proxy", true);

app.get("/", (req: Request, res: Response) => {
  res.send("Pliengaz - Infotech Server is up and running.");
});

app.use(
  express.json({
    strict: false,
    verify: (req, res, buf) => {
      if (!buf.length) return;
    },
  })
);

const allowedIps = [
  "123.45.67.89",
  "98.76.54.32",
  "127.0.0.1",
  "31.97.113.198",
];

// app.use((req: Request, res: Response, next: NextFunction) => {
//   const clientIp =
//     req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"];

//   const ip = (clientIp as string).replace("::ffff:", "");

//   if (allowedIps.includes(ip)) {
//     next();
//   } else {
//     res.status(403).json({
//       status: "fail",
//       message: `Your IP (${ip}) is not allowed to access this server.`,
//     });
//   }
// });

app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/docs.json", (req, res) => {
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=openapi-spec.json"
  );
  res.json(swaggerSpec);
});
app.use("/api/v1/roles", roleRouter);
app.use("/api/v1/departments", departmentRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/permissions", permissionRouter);
app.use("/api/v1/activity-logs", activityLogRouter);
app.use("/api/v1/admin-config", adminConfigRouter);
app.use("/api/v1/permission-overrides", PermissionOverrideRouter);
app.use("/api/v1/role-permissions", rolePermissionRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/device-tokens", deviceTokenRouter);
app.use("/api/v1/notification-preferences", notificationPreferencesRouter);
app.use("/api/v1/finance-settings", financeSettingsRouter);
app.use("/api/v1/exchange-rates", exchangeRateRouter);
app.use("/api/v1/suppliers", supplierRouter);
app.use("/api/v1/supplier-contacts", supplierContactRouter);
app.use("/api/v1/supplier-addresses", supplierAddressRouter);

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`Invalid route accessed: ${req.originalUrl}`);
  next(
    new AppError(
      `${req.originalUrl} does not exist for ${req.method} requests`,
      StatusCodes.NOT_FOUND
    )
  );
});

app.use(globalErrorController);
