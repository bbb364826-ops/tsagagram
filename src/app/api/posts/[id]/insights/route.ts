import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || post.userId !== session.userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [likes, comments, saves, views] = await Promise.all([
    prisma.like.count({ where: { postId: id } }),
    prisma.comment.count({ where: { postId: id } }),
    prisma.save.count({ where: { postId: id } }),
    prisma.postView.count({ where: { postId: id } }),
  ]);

  // Likes over time (last 7 days, grouped by day)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentLikes = await prisma.like.findMany({
    where: { postId: id, createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true },
  });

  const likesPerDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    likesPerDay[d.toLocaleDateString("ka-GE", { month: "short", day: "numeric" })] = 0;
  }
  for (const l of recentLikes) {
    const key = new Date(l.createdAt).toLocaleDateString("ka-GE", { month: "short", day: "numeric" });
    if (key in likesPerDay) likesPerDay[key]++;
  }

  // Top commenters
  const topCommenters = await prisma.comment.groupBy({
    by: ["userId"],
    where: { postId: id },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 3,
  });

  const commenterUsers = await prisma.user.findMany({
    where: { id: { in: topCommenters.map(c => c.userId) } },
    select: { id: true, username: true, avatar: true },
  });

  return NextResponse.json({
    likes,
    comments,
    saves,
    views,
    reach: Math.round(views * 0.7), // estimated unique reach
    likesPerDay: Object.entries(likesPerDay).map(([date, count]) => ({ date, count })),
    topCommenters: topCommenters.map(c => ({
      ...commenterUsers.find(u => u.id === c.userId),
      commentCount: c._count.id,
    })),
    engagement: views > 0 ? ((likes + comments) / views * 100).toFixed(1) : "0",
  });
}
