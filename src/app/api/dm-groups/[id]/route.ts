import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json([], { status: 401 });

  const { id } = await params;

  const member = await prisma.dmGroupMember.findUnique({
    where: { userId_groupId: { userId: session.userId, groupId: id } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const messages = await prisma.dmGroupMessage.findMany({
    where: { groupId: id },
    include: { sender: { select: { id: true, username: true, avatar: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const member = await prisma.dmGroupMember.findUnique({
    where: { userId_groupId: { userId: session.userId, groupId: id } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { text, mediaUrl } = await req.json();
  if (!text?.trim() && !mediaUrl) return NextResponse.json({ error: "Text or media required" }, { status: 400 });

  const message = await prisma.dmGroupMessage.create({
    data: { text: text || null, mediaUrl: mediaUrl || null, senderId: session.userId, groupId: id },
    include: { sender: { select: { id: true, username: true, avatar: true } } },
  });

  return NextResponse.json(message, { status: 201 });
}
