import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: postId } = await params;

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: session.userId, postId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    return NextResponse.json({ liked: false });
  }

  await prisma.like.create({ data: { userId: session.userId, postId } });

  // Create notification + push
  const [post, sender] = await Promise.all([
    prisma.post.findUnique({ where: { id: postId }, select: { userId: true } }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { username: true } }),
  ]);
  if (post && post.userId !== session.userId) {
    await prisma.notification.create({
      data: { type: "like", receiverId: post.userId, senderId: session.userId, postId },
    });
    sendPushToUser(post.userId, {
      title: "Tsagagram",
      body: `@${sender?.username} მოიწონა თქვენი პოსტი`,
      url: `/p/${postId}`,
    });
  }

  return NextResponse.json({ liked: true });
}
