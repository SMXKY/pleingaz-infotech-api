import { InputJsonValue } from "src/generated/prisma/runtime/library";

export enum LogOperation {
  CREATE = "CREATE",
  READ = "READ",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  AUTH = "AUTH",
  FORGOT_PASSWORD = "FORGOT_PASSWORD",
  RESET_PASSWORD = "RESET_PASSWORD",
  CHANGE_PASSWORD = "CHANGE_PASSWORD",
  CHANGE_USER_CREDENTIALS = "CHANGE_USER_CREDENTIALS",
}

export enum LogCategory {
  WRITE = "WRITE",
  READ = "READ",
  SENSITIVE_READ = "SENSITIVE_READ",
}

export enum LogStatus {
  FAILED = "FAILED",
  SUCCESS = "SUCCESS",
}

export interface LogUserActivityInput {
  userId?: string;
  userEmail: string;
  operation: LogOperation;
  category: LogCategory;
  tableName: string;
  recordId: string;
  previousState?: InputJsonValue | null;
  newState?: InputJsonValue | null;
  changedFields?: string[];
  userAgent?: string;
  requestId?: string;
  metadata?: InputJsonValue;
}
