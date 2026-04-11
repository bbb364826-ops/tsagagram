import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetUserId, mutePosts, muteStories } = await req.json();

  const existing = await prisma.mute.findUnique({
    where: { muterId_mutedId: { muterId: session.userId, mutedId: targetUserId } },
  });

  if (existing) {
    // Update or remove
    const newMutePosts = mutePosts ?? existing.mutePosts;
    const newMuteStories = muteStories ?? existing.muteStories;

    if (!newMutePosts && !newMuteStories) {
      await prisma.mute.delete({ where: { id: existing.id } });
      return NextResponse.json({ muted: false });
    }

    const updated = await prisma.mute.update({
      where: { id: existing.id },
      data: { mutePosts: newMutePosts, muteStories: newMuteStories },
    });
    return NextResponse.json({ muted: true, ...updated });
  }

  const mute = await prisma.mute.create({
    data: {
      muterId: session.userId,
      mutedId: targetUserId,
      mutePosts: mutePosts ?? true,
      muteStories: muteStories ?? false,
    },
  });

  return NextResponse.json({ muted: true, ...mute });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ muted: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId");

  if (targetUserId) {
    const mute = await prisma.mute.findUnique({
      where: { muterId_mutedId: { muterId: session.userId, mutedId: targetUserId } },
    });
    return NextResponse.json({ muted: !!mute, mutePosts: mute?.mutePosts ?? false, muteStories: mute?.muteStories ?? false });
  }

  const mutes = await prisma.mute.findMany({
    where: { muterId: session.userId },
    include: { muted: { select: { id: true, username: true, avatar: true, name: true } } },
  });
  return NextResponse.json(mutes);
}
