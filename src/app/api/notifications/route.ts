import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json([], { status: 401 });

  // Fetch + mark-read in parallel
  const [notifications] = await Promise.all([
    prisma.notification.findMany({
      where: { receiverId: session.userId },
      include: { sender: { select: { username: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.updateMany({
      where: { receiverId: session.userId, read: false },
      data: { read: true },
    }),
  ]);

  const res = NextResponse.json(notifications);
  res.headers.set("Cache-Control", "private, max-age=0");
  return res;
}
