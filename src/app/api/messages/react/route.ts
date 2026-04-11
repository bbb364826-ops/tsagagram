import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId, emoji } = await req.json();
  if (!messageId || !emoji) return NextResponse.json({ error: "messageId and emoji required" }, { status: 400 });

  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId: { messageId, userId: session.userId } },
  });

  if (existing) {
    if (existing.emoji === emoji) {
      await prisma.messageReaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ removed: true });
    } else {
      const updated = await prisma.messageReaction.update({
        where: { id: existing.id },
        data: { emoji },
      });
      return NextResponse.json(updated);
    }
  }

  const reaction = await prisma.messageReaction.create({
    data: { messageId, userId: session.userId, emoji },
  });

  return NextResponse.json(reaction, { status: 201 });
}
