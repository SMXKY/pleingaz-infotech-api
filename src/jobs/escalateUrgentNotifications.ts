import { subMinutes } from "date-fns";
import { sendEmail } from "@utils/sendEmail.util";
import { URGENT_ESCALATION_MINUTES, JOB_BATCH_SIZE } from "./constants";
import prisma from "@models/index.model";

export async function escalateUrgentNotifications(): Promise<void> {
  const cutoff = subMinutes(new Date(), URGENT_ESCALATION_MINUTES);

  const undelivered = await prisma.notification.findMany({
    where: {
      priority: "URGENT",
      status: "PENDING",
      createdAt: { lt: cutoff },
      deliveredVia: null,
    },
    include: {
      recipient: {
        select: {
          id: true,
          email: true,
          name: true,
          surname: true,
          preference: {
            select: {
              language: true,
            },
          },
        },
      },
    },
    take: JOB_BATCH_SIZE,
    orderBy: { createdAt: "asc" },
  });

  if (undelivered.length === 0) {
    console.log("[escalate-urgent] No undelivered urgent notifications found");
    return;
  }

  console.log(
    `[escalate-urgent] Found ${undelivered.length} urgent notification(s) to escalate`
  );

  let successCount = 0;
  let failCount = 0;

  for (const notification of undelivered) {
    try {
      if (!notification.recipient.email) {
        console.warn(
          `[escalate-urgent] Recipient ${notification.recipientId} has no email, skipping`
        );
        continue;
      }

      const isFrench = notification.recipient.preference?.language === "FR";

      const title = isFrench
        ? notification.titleFrench
        : notification.titleEnglish;
      const body = isFrench
        ? notification.bodyFrench
        : notification.bodyEnglish;

      const subject = isFrench
        ? "Notification urgente – Action requise"
        : "Urgent Notification – Action Required";

      const text = isFrench
        ? `Bonjour ${notification.recipient.name},
  
  Vous avez reçu une notification urgente dans votre compte.
  
  Titre : ${title}
  
  Message :
  ${body}
  
  Veuillez vous connecter au système pour la consulter et la traiter dès que possible.`
        : `Hello ${notification.recipient.name},
  
  You have received an urgent notification in your account.
  
  Title: ${title}
  
  Message:
  ${body}
  
  Please log in to the system to review and address it as soon as possible.`;

      const html = isFrench
        ? `
  <h2>Notification urgente</h2>
  <p>Bonjour ${notification.recipient.name},</p>
  
  <p><strong>${title}</strong></p>
  <p>${body}</p>
  
  <p>Veuillez vous connecter au système pour consulter cette notification.</p>
  
  ${
    notification.actionUrl
      ? `<p><a href="${notification.actionUrl}">Ouvrir la notification</a></p>`
      : ""
  }`
        : `
  <h2>Urgent Notification</h2>
  <p>Hello ${notification.recipient.name},</p>
  
  <p><strong>${title}</strong></p>
  <p>${body}</p>
  
  <p>Please log in to the system to review this notification.</p>
  
  ${
    notification.actionUrl
      ? `<p><a href="${notification.actionUrl}">Open Notification</a></p>`
      : ""
  }`;

      await sendEmail(notification.recipient.email, subject, text, html);

      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: "DELIVERED",
          deliveredAt: new Date(),
          deliveredVia: "EMAIL",
        },
      });

      successCount++;
    } catch (error) {
      failCount++;
      console.error(
        `[escalate-urgent] Failed to email notification ${notification.id}:`,
        error
      );

      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          attempts: { increment: 1 },
          lastError:
            error instanceof Error ? error.message : "Email delivery failed",
        },
      });
    }
  }

  console.info(
    `[escalate-urgent] Completed: ${successCount} emailed, ${failCount} failed`
  );
}
