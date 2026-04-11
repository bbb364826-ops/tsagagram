import { prisma } from "@/lib/prisma";

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

    // Dynamic import to avoid build-time issues
    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@tsagagram.ge",
      process.env.VAPID_PUBLIC_KEY || "",
      process.env.VAPID_PRIVATE_KEY || ""
    );

    const subscription = JSON.parse(user.pushSubscription);
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch {
    await prisma.user.update({ where: { id: userId }, data: { pushSubscription: null } }).catch(() => {});
  }
}
