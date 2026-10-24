// environmentVariablesCheck.util throws at import time if these are missing.
const testEnv: Record<string, string> = {
  NODE_ENV: "test",
  BASE_URL: "http://localhost:3000",
  FRONTEND_URL: "http://localhost:5173",
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  JWT_SECRET: "test-secret",
  JWT_EXPIRES_IN: "1d",
  PASSWORD_RESET_EXPIRES_IN: "15",
  EMAIL_VERIFICATION_EXPIRES_IN: "24",
  MAX_LOGIN_ATTEMPTS: "5",
  ACCOUNT_LOGIN_WAIT_TIME_HOURS: "1",
  RESET_PASSWORD_LIMIT_HOURS: "1",
  FTP_BASE_URL: "http://files.test",
  SUPER_ADMIN_EMAIL: "admin@test.local",
  UNIRATEAPI_KEY: "test",
  SOCKET_IO_PATH: "/socket.io",
  SOCKET_IO_CORS_ORIGIN: "*",
  DEFAULT_PAGE_SIZE: "20",
  MAX_PAGE_SIZE: "100",
  MAX_BATCH_SIZE: "500",
  FIREBASE_PROJECT_ID: "test",
  FIREBASE_PRIVATE_KEY: "test",
  FIREBASE_CLIENT_EMAIL: "test@test.local",
};

for (const [key, value] of Object.entries(testEnv)) {
  process.env[key] ??= value;
}
