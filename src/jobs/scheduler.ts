import { PgBoss, ScheduleOptions } from "pg-boss";
import { NOTIFICATION_JOBS } from "./constants";
import { escalateUrgentNotifications } from "./escalateUrgentNotifications";
import { expireOldNotifications } from "./expireOldNotifications";
import { cleanupReadNotifications } from "./cleanupReadNotifications";
import { cleanupStaleDeviceTokens } from "./cleanupStaleDeviceTokens";

type JobHandler = () => Promise<void>;

interface ScheduledJob {
  name: string;
  cron: string;
  handler: JobHandler;
  options: ScheduleOptions;
}

const scheduledJobs: ScheduledJob[] = [
  {
    ...NOTIFICATION_JOBS.ESCALATE_URGENT,
    handler: escalateUrgentNotifications,
  },
  {
    ...NOTIFICATION_JOBS.EXPIRE_OLD,
    handler: expireOldNotifications,
  },
  {
    ...NOTIFICATION_JOBS.CLEANUP_READ,
    handler: cleanupReadNotifications,
  },
  {
    ...NOTIFICATION_JOBS.CLEANUP_STALE_TOKENS,
    handler: cleanupStaleDeviceTokens,
  },
];

export async function registerNotificationJobs(boss: PgBoss): Promise<void> {
  for (const job of scheduledJobs) {
    await boss.work(job.name, async () => {
      const startTime = Date.now();
      console.info(`[job] Starting: ${job.name}`);

      try {
        await job.handler();
        const duration = Date.now() - startTime;
        console.info(`[job] Completed: ${job.name} (${duration}ms)`);
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[job] Failed: ${job.name} (${duration}ms)`, error);
        throw error;
      }
    });
    await boss.schedule(job.name, job.cron, {}, job.options);

    console.info(`[job] Scheduled: ${job.name} (${job.cron})`);
  }

  console.info(
    `[job] All ${scheduledJobs.length} notification jobs registered`
  );
}
