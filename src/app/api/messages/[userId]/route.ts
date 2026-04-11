import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Get messages between current user and userId
export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json([], { status: 401 });

  const { userId } = await params;

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: session.userId, receiverId: userId },
        { senderId: userId, receiverId: session.userId },
      ],
    },
    include: {
      sender: { select: { id: true, username: true, avatar: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Mark as read
  await prisma.message.updateMany({
    where: { senderId: userId, receiverId: session.userId, read: false },
    data: { read: true },
  });

  // Vanish mode: delete vanish=true messages that are now read
  await prisma.message.deleteMany({
    where: {
      OR: [
        { senderId: userId, receiverId: session.userId, vanish: true, read: true },
        { senderId: session.userId, receiverId: userId, vanish: true, read: true },
      ],
    },
  });

  return NextResponse.json(messages);
}

// Send a message
export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;
  const { text, voiceUrl, mediaUrl } = await req.json();
  if (!text?.trim() && !voiceUrl && !mediaUrl) return NextResponse.json({ error: "ტექსტი, ხმა ან მედია სავალდებულოა" }, { status: 400 });

  // Check if sender follows receiver — if not, mark as request
  const follows = await prisma.follow.findFirst({ where: { followerId: session.userId, followingId: userId } });
  // Also check if there are existing accepted messages (request already accepted)
  const hasExistingMessages = await prisma.message.findFirst({
    where: { senderId: session.userId, receiverId: userId, isRequest: false },
  });
  const isRequest = !follows && !hasExistingMessages;

  const message = await prisma.message.create({
    data: { text: text || null, voiceUrl: voiceUrl || null, mediaUrl: mediaUrl || null, senderId: session.userId, receiverId: userId, isRequest },
    include: { sender: { select: { id: true, username: true, avatar: true } } },
  });

  return NextResponse.json(message, { status: 201 });
}

// Delete message for everyone
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await params; // consume params
  const { messageId } = await req.json();

  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg || msg.senderId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.message.update({ where: { id: messageId }, data: { deleted: true, text: null, mediaUrl: null, voiceUrl: null } });
  return NextResponse.json({ ok: true });
}
