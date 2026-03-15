import { subDays } from "date-fns";
import { NOTIFICATION_RETENTION_DAYS, JOB_BATCH_SIZE } from "./constants";
import prisma from "@models/index.model";

export async function cleanupReadNotifications(): Promise<void> {
  const cutoff = subDays(new Date(), NOTIFICATION_RETENTION_DAYS);
  let totalDeleted = 0;

  while (true) {
    const batch = await prisma.notification.findMany({
      where: {
        status: { in: ["READ", "EXPIRED", "FAILED"] },
        createdAt: { lt: cutoff },
      },
      select: { id: true },
      take: JOB_BATCH_SIZE,
    });

    if (batch.length === 0) break;

    const ids = batch.map((n) => n.id);

    const result = await prisma.notification.deleteMany({
      where: { id: { in: ids } },
    });

    totalDeleted += result.count;

    if (batch.length < JOB_BATCH_SIZE) break;
  }

  if (totalDeleted > 0) {
    console.info(
      `[cleanup-read] Deleted ${totalDeleted} old notification(s) (older than ${NOTIFICATION_RETENTION_DAYS} days)`
    );
  } else {
    console.debug("[cleanup-read] No old notifications to clean up");
  }
}
