import express, { Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import { StatusCodes } from "http-status-codes";
import {
  exploitationSchemas,
  exploitationPaths,
  exploitationTags,
} from "./docs/exploitation-openapi";
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
import { PermissionOverrideRouter } from "./modules/permissionOverrides";
import { rolePermissionRouter } from "./modules/rolePermissions";
import permissionRouter from "./modules/permissions/permission.route";
import { notificationRouter } from "./modules/notifications";
import { deviceTokenRouter } from "./modules/deviceTokens";
import notificationPreferencesRouter from "./modules/notificationPreferences/notificationPreference.route";
import financeSettingsRouter from "./modules/financeSettings/financeSettings.route";
import exchangeRateRouter from "./modules/exchangeRates/exchangeRates.route";
import { supplierRouter } from "./modules/suppliers";
import { supplierContactRouter } from "./modules/supplierContacts";
import { supplierAddressRouter } from "./modules/supplierAddresses";
import { supplierPaymentMethodRouter } from "./modules/supplierPaymentMethods";
import supplierCommercialTermsRouter from "./modules/supplierCommercialTerms/supplierCommercialTerms.route";
import { exploitationDepotRouter } from "./modules/exploitationDepot";
import { exploitationDriverRouter } from "./modules/exploitationDriver";
import { exploitationTankerRouter } from "./modules/exploitationTanker";
import { gasBottleTypeRouter } from "./modules/gasBottleType";
import { accessoryCategoryRouter } from "./modules/accessoryCategory";
import { accessoryItemRouter } from "./modules/accessoryItem";
import { exploitationDocumentRouter } from "./modules/exploitationDocument";
import { gasPurchaseOrderRouter } from "./modules/gasPurchaseOrder";
import { approvalRouter } from "./modules/approval";
import { paymentRouter } from "./modules/payments";
import { orderEmailRouter } from "./modules/supplierEmails";
import { gasBottlePurchaseOrderRouter } from "./modules/gasBottlePurchaseOrders";
import dashboardAndAnalyticsRouter from "./modules/dashboardAndStatics/dashboardAndStatics.routes";
import accessoryPurchaseOrderRouter from "./modules/accessoryPurchaseOrder/accessoryPurchaseOrder.route";
import exploitationInvoiceRouter from "./modules/ExploitationInvoice/ExploitationInvoice.route";

// Handle BigInt JSON serialization globally
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export const app = express();

// Comma-separated list of allowed origins; falls back to "*" when unset.
const corsOrigins = process.env.CORS_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin: corsOrigins?.length ? corsOrigins : "*",
  credentials: false,
};
app.use(cors(corsOptions));

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

app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(JSON.parse(JSON.stringify(swaggerSpec)))
);
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
app.use("/api/v1/supplier-payment-methods", supplierPaymentMethodRouter);
app.use("/api/v1/supplier-commercial-terms", supplierCommercialTermsRouter);
app.use("/api/v1/depots", exploitationDepotRouter);
app.use("/api/v1/drivers", exploitationDriverRouter);
app.use("/api/v1/tankers", exploitationTankerRouter);
app.use("/api/v1/bottle-types", gasBottleTypeRouter);
app.use("/api/v1/accessory-categories", accessoryCategoryRouter);
app.use("/api/v1/accessory-items", accessoryItemRouter);
app.use("/api/v1/accessory-purchase-orders", accessoryPurchaseOrderRouter);
app.use("/api/v1/exploitation-documents", exploitationDocumentRouter);
app.use("/api/v1/gas-purchase-orders", gasPurchaseOrderRouter);
app.use("/api/v1/gas-bottle-purchase-orders", gasBottlePurchaseOrderRouter);
app.use("/api/v1/approvals", approvalRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/exploitation-order-emails", orderEmailRouter);
app.use("/api/v1/dashboard-and-analytics", dashboardAndAnalyticsRouter);
app.use("/api/v1/exploitation-invoices", exploitationInvoiceRouter);

app.set("json replacer", function (_key: string, value: any) {
  if (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "d" in value &&
    "e" in value &&
    "s" in value
  ) {
    const sign = value.s === -1 ? -1 : 1;
    const digits = value.d;
    const exponent = value.e;

    if (!Array.isArray(digits) || digits.length === 0) return "0";

    let str = digits[0].toString();
    for (let i = 1; i < digits.length; i++) {
      str += digits[i].toString().padStart(7, "0");
    }

    const intDigits = exponent + 1;
    if (intDigits >= str.length) {
      str = str.padEnd(intDigits, "0");
    } else if (intDigits <= 0) {
      str = "0." + "0".repeat(-intDigits) + str;
    } else {
      str = str.slice(0, intDigits) + "." + str.slice(intDigits);
    }

    str = str.replace(/\.?0+$/, "");

    return sign === -1 ? "-" + str : str;
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
});

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
