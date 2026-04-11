import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;
  const session = await getSession();
  const parentId = req.nextUrl.searchParams.get("parentId");

  const comments = await prisma.comment.findMany({
    where: { postId, parentId: parentId || null },
    include: {
      user: { select: { id: true, username: true, avatar: true, verified: true } },
      likes: { select: { userId: true } },
      _count: { select: { replies: true, likes: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments.map(c => ({
    ...c,
    isLiked: session ? c.likes.some(l => l.userId === session.userId) : false,
  })));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: postId } = await params;
  const { text, parentId } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Text required" }, { status: 400 });

  const comment = await prisma.comment.create({
    data: { text, postId, userId: session.userId, parentId: parentId || null },
    include: {
      user: { select: { id: true, username: true, avatar: true, verified: true } },
      _count: { select: { replies: true, likes: true } },
    },
  });

  const [post, sender] = await Promise.all([
    prisma.post.findUnique({ where: { id: postId }, select: { userId: true } }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { username: true } }),
  ]);
  if (post && post.userId !== session.userId) {
    await prisma.notification.create({
      data: { type: "comment", receiverId: post.userId, senderId: session.userId, postId, commentId: comment.id },
    });
    sendPushToUser(post.userId, {
      title: "Tsagagram",
      body: `@${sender?.username}: ${text.slice(0, 60)}`,
      url: `/p/${postId}`,
    });
  }

  // Notify reply parent author
  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId }, select: { userId: true } });
    if (parent && parent.userId !== session.userId) {
      await prisma.notification.create({
        data: { type: "reply", receiverId: parent.userId, senderId: session.userId, postId, commentId: comment.id },
      });
    }
  }

  // Mention notifications (@username in comment text)
  const mentions = text.match(/@([\w\u10D0-\u10FF]+)/g) || [];
  for (const mention of mentions) {
    const username = mention.slice(1);
    const mentioned = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (mentioned && mentioned.id !== session.userId) {
      await prisma.notification.create({
        data: { type: "mention", receiverId: mentioned.id, senderId: session.userId, postId, commentId: comment.id },
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ...comment, isLiked: false }, { status: 201 });
}
