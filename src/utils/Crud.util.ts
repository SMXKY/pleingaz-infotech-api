import { Request } from "express";
import { ActivityLogModel } from "../models/ActivityLog.model";

const normalizeIp = (ip?: string): string | undefined => {
  if (!ip) return;
  if (ip === "::1") return "127.0.0.1";
  return ip.replace(/^::ffff:/, "");
};

export const getClientIp = (req: Request): string | undefined => {
  const rawIp =
    req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
    req.socket.remoteAddress ||
    req.ip;
  return normalizeIp(rawIp);
};

export const logUserActivity = async (
  req: Request,
  userId: string,
  action: string,
  collection: string,
  resourceId: string | undefined,
  previousDocumentState: string,
  newDocumentState: string
) => {
  // console.log("User IP", getClientIp(req));
  await ActivityLogModel.create({
    user: userId,
    action,
    collectionName: collection,
    resourceId,
    previousDocumentState,
    newDocumentState,
    ipAddress: getClientIp(req),
  });
};
