import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetUserId } = await req.json();
  if (targetUserId === session.userId) return NextResponse.json({ error: "საკუთარ თავს ვერ მიყვები" }, { status: 400 });

  // Check if blocked
  const blocked = await prisma.block.findFirst({
    where: { OR: [{ blockerId: session.userId, blockedId: targetUserId }, { blockerId: targetUserId, blockedId: session.userId }] },
  });
  if (blocked) return NextResponse.json({ error: "Blocked" }, { status: 403 });

  // Check existing follow
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: session.userId, followingId: targetUserId } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false, requested: false });
  }

  // Check existing request
  const existingRequest = await prisma.followRequest.findUnique({
    where: { fromId_toId: { fromId: session.userId, toId: targetUserId } },
  });

  if (existingRequest) {
    await prisma.followRequest.delete({ where: { id: existingRequest.id } });
    return NextResponse.json({ following: false, requested: false });
  }

  // Check if target is private
  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { isPrivate: true } });

  const sender = await prisma.user.findUnique({ where: { id: session.userId }, select: { username: true } });

  if (target?.isPrivate) {
    await prisma.followRequest.create({ data: { fromId: session.userId, toId: targetUserId } });
    await prisma.notification.create({
      data: { type: "follow_request", receiverId: targetUserId, senderId: session.userId },
    });
    sendPushToUser(targetUserId, { title: "Tsagagram", body: `@${sender?.username} გამოგყვება სთხოვა`, url: `/follow-requests` });
    return NextResponse.json({ following: false, requested: true });
  }

  await prisma.follow.create({ data: { followerId: session.userId, followingId: targetUserId } });
  await prisma.notification.create({
    data: { type: "follow", receiverId: targetUserId, senderId: session.userId },
  });
  sendPushToUser(targetUserId, { title: "Tsagagram", body: `@${sender?.username} გამოგყვა`, url: `/u/${sender?.username}` });

  return NextResponse.json({ following: true, requested: false });
}
