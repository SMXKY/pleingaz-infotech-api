/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
  // Mirrors the path aliases in tsconfig.json; bare "src/..." imports resolve via modulePaths.
  modulePaths: ["<rootDir>"],
  moduleNameMapper: {
    "^@controllers/(.*)$": "<rootDir>/src/controllers/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@middlewares/(.*)$": "<rootDir>/src/middlewares/$1",
    "^@models/(.*)$": "<rootDir>/src/models/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
    "^@cron-jobs/(.*)$": "<rootDir>/src/cron-jobs/$1",
    "^@defaults/(.*)$": "<rootDir>/src/defaults/$1",
    "^@public/(.*)$": "<rootDir>/src/public/$1",
    "^@appTypes/(.*)$": "<rootDir>/src/appTypes/$1",
    "^@locales/(.*)$": "<rootDir>/src/locales/$1",
  },
  setupFiles: ["<rootDir>/tests/setup-env.ts"],
  clearMocks: true,
};
