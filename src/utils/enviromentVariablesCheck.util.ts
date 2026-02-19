if (!process.env.BASE_URL) {
  throw new Error("Base url enviroment variable not set");
}

if (!process.env.FRONTEND_URL) {
  throw new Error("Frontend url enviroment variable not set");
}

if (!process.env.ACCOUNT_LOGIN_WAIT_TIME_HOURS) {
  throw new Error("ACCOUNT_LOGIN_WAIT_TIME_HOURS enviroment variable not set");
}

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET enviroment variable not set");
}

if (!process.env.JWT_EXPIRES_IN) {
  throw new Error("JWT_EXPIRES_IN enviroment variable not set");
}

if (!process.env.PASSWORD_RESET_EXPIRES_IN) {
  throw new Error("PASSWORD_RESET_EXPIRES_IN enviroment variable not set");
}

if (!process.env.EMAIL_VERIFICATION_EXPIRES_IN) {
  throw new Error("EMAIL_VERIFICATION_EXPIRES_IN enviroment variable not set");
}

if (!process.env.MAX_LOGIN_ATTEMPTS) {
  throw new Error("MAX_LOGIN_ATTEMPTS enviroment variable not set");
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
