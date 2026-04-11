import webpush from "web-push";
import { prisma } from "@/lib/prisma";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@tsagagram.ge",
  process.env.VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushSubscription: true },
    });
    if (!user?.pushSubscription) return;

    const subscription = JSON.parse(user.pushSubscription);
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch {
    // Subscription expired or invalid — clear it
    await prisma.user.update({ where: { id: userId }, data: { pushSubscription: null } }).catch(() => {});
  }
}
