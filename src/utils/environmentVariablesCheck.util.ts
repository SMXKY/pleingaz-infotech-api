if (!process.env.BASE_URL) {
  throw new Error("Base url environment variable not set");
}

if (!process.env.FRONTEND_URL) {
  throw new Error("Frontend url environment variable not set");
}

if (!process.env.ACCOUNT_LOGIN_WAIT_TIME_HOURS) {
  throw new Error("ACCOUNT_LOGIN_WAIT_TIME_HOURS environment variable not set");
}

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable not set");
}

if (!process.env.JWT_EXPIRES_IN) {
  throw new Error("JWT_EXPIRES_IN environment variable not set");
}

if (!process.env.PASSWORD_RESET_EXPIRES_IN) {
  throw new Error("PASSWORD_RESET_EXPIRES_IN environment variable not set");
}

if (!process.env.EMAIL_VERIFICATION_EXPIRES_IN) {
  throw new Error("EMAIL_VERIFICATION_EXPIRES_IN environment variable not set");
}

if (!process.env.MAX_LOGIN_ATTEMPTS) {
  throw new Error("MAX_LOGIN_ATTEMPTS environment variable not set");
}

if (!process.env.RESET_PASSWORD_LIMIT_HOURS) {
  throw new Error("RESET_PASSWORD_LIMIT_HOURS environment variable not set");
}

if (!process.env.FTP_BASE_URL) {
  throw new Error("FTP_BASE_URL environment variable not set");
}

if (!process.env.SUPER_ADMIN_EMAIL) {
  throw new Error("SUPER_ADMIN_EMAIL environment variable not set");
}

if (!process.env.UNIRATEAPI_KEY) {
  throw new Error("UNIRATEAPI KEY environment variable not set");
}

if (!process.env.SOCKET_IO_PATH) {
  throw new Error("SOCKET_IO_PATH environment variable not set");
}

if (!process.env.SOCKET_IO_CORS_ORIGIN) {
  throw new Error("SOCKET_IO_CORS_ORIGIN environment variable not set");
}

if (!process.env.DEFAULT_PAGE_SIZE) {
  throw new Error("DEFAULT_PAGE_SIZE environment variable not set");
}

if (!process.env.MAX_PAGE_SIZE) {
  throw new Error("MAX_PAGE_SIZE environment variable not set");
}

if (!process.env.MAX_BATCH_SIZE) {
  throw new Error("MAX_BATCH_SIZE environment variable not set");
}

if (!process.env.FIREBASE_PROJECT_ID) {
  throw new Error("FIREBASE_PROJECT_ID environment variable not set");
}

if (!process.env.FIREBASE_PRIVATE_KEY) {
  throw new Error("FIREBASE_PRIVATE_KEY environment variable not set");
}

if (!process.env.FIREBASE_CLIENT_EMAIL) {
  throw new Error("FIREBASE_CLIENT_EMAIL environment variable not set");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable not set");
}

export const baseUrl = process.env.BASE_URL;
export const frontEndUrl = process.env.FRONTEND_URL;
export const ACCOUNT_LOGIN_WAIT_TIME_HOURS =
  process.env.ACCOUNT_LOGIN_WAIT_TIME_HOURS;
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
export const PASSWORD_RESET_EXPIRES_IN = process.env.PASSWORD_RESET_EXPIRES_IN;
export const EMAIL_VERIFICATION_EXPIRES_IN =
  process.env.EMAIL_VERIFICATION_EXPIRES_IN;
export const MAX_LOGIN_ATTEMPTS = process.env.MAX_LOGIN_ATTEMPTS;
export const RESET_PASSWORD_LIMIT_HOURS =
  process.env.RESET_PASSWORD_LIMIT_HOURS;
export const FTP_BASE_URL = process.env.FTP_BASE_URL;
export const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
export const UNIRATEAPI_KEY = process.env.UNIRATEAPI_KEY;
export const SOCKET_IO_PATH = process.env.SOCKET_IO_PATH;
export const SOCKET_IO_CORS_ORIGIN = process.env.SOCKET_IO_CORS_ORIGIN;
export const DEFAULT_PAGE_SIZE = Number(process.env.DEFAULT_PAGE_SIZE);
export const MAX_PAGE_SIZE = Number(process.env.MAX_PAGE_SIZE);
export const MAX_BATCH_SIZE = Number(process.env.MAX_BATCH_SIZE);
export const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
export const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY;
export const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
export const DATABASE_URL = process.env.DATABASE_URL;
