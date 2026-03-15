export const NOTIFICATION_JOBS = {
  ESCALATE_URGENT: {
    name: "notification_escalate_urgent",
    cron: "*/5 * * * *",
    options: {
      retryLimit: 2,
      retryDelay: 60,
      expireInMinutes: 4,
    },
  },

  EXPIRE_OLD: {
    name: "notification_expire_old",
    cron: "0 2 * * *",
    options: {
      retryLimit: 2,
      retryDelay: 300,
      expireInMinutes: 30,
    },
  },

  CLEANUP_READ: {
    name: "notification_cleanup_read",
    cron: "0 3 * * 0",
    options: {
      retryLimit: 2,
      retryDelay: 600,
      expireInMinutes: 60,
    },
  },

  CLEANUP_STALE_TOKENS: {
    name: "notification_cleanup_stale_tokens",
    cron: "0 4 * * 0",
    options: {
      retryLimit: 2,
      retryDelay: 300,
      expireInMinutes: 15,
    },
  },
} as const;

export const URGENT_ESCALATION_MINUTES = parseInt(
  process.env.NOTIFICATION_URGENT_ESCALATION_MINUTES || "10",
  10
);

export const NOTIFICATION_RETENTION_DAYS = parseInt(
  process.env.NOTIFICATION_RETENTION_DAYS || "90",
  10
);

export const STALE_TOKEN_DAYS = parseInt(
  process.env.STALE_TOKEN_DAYS || "90",
  10
);

export const JOB_BATCH_SIZE = parseInt(process.env.JOB_BATCH_SIZE || "90", 10);
