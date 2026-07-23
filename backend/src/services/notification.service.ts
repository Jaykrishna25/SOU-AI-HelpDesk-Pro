import { prisma } from "../config/db";
import { NotificationChannel } from "@prisma/client";

export async function notify(userId: string, title: string, body: string, link?: string) {
  return prisma.notification.create({
    data: { userId, title, body, link, channel: NotificationChannel.IN_APP },
  });
}

// AWS SES email (mocked as EmailLog persistence in demo mode)
export async function sendEmail(toEmail: string, subject: string, body: string, ticketId?: string) {
  return prisma.emailLog.create({
    data: { toEmail, subject, body, ticketId, provider: "AWS_SES", status: "SENT" },
  });
}

// Notify every watcher of a ticket across channels.
export async function notifyWatchers(ticketId: string, title: string, body: string) {
  const watchers = await prisma.ticketWatcher.findMany({
    where: { ticketId }, include: { user: true },
  });
  await Promise.all(
    watchers.map(async (w) => {
      await notify(w.userId, title, body, `/tickets/${ticketId}`);
      if (w.user.email) await sendEmail(w.user.email, title, body, ticketId);
    })
  );
  return watchers.length;
}
