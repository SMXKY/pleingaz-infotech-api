import prisma from "@models/index.model";

export async function expireOldNotifications(): Promise<void> {
  const now = new Date();

  const result = await prisma.notification.updateMany({
    where: {
      expiresAt: { lt: now },
      status: { in: ["PENDING", "DELIVERED"] },
    },
    data: {
      status: "EXPIRED",
    },
  });

  if (result.count > 0) {
    console.info(
      `[expire-old] Marked ${result.count} notification(s) as EXPIRED`
    );
  } else {
    console.debug("[expire-old] No expired notifications found");
  }
}
