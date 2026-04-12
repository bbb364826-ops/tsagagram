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

  // Fetch post thumbnails for notifications that have a postId
  const postIds = [...new Set(notifications.map(n => n.postId).filter(Boolean))] as string[];
  let postImages: Record<string, string> = {};
  if (postIds.length > 0) {
    const posts = await prisma.post.findMany({
      where: { id: { in: postIds } },
      select: { id: true, images: true },
    });
    for (const p of posts) {
      try {
        const imgs = JSON.parse(p.images);
        if (Array.isArray(imgs) && imgs[0]) postImages[p.id] = imgs[0];
      } catch {}
    }
  }

  const enriched = notifications.map(n => ({
    ...n,
    postImage: n.postId ? (postImages[n.postId] ?? null) : null,
  }));

  const res = NextResponse.json(enriched);
  res.headers.set("Cache-Control", "private, max-age=0");
  return res;
}
