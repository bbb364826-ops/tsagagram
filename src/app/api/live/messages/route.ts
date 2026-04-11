import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const streamId = searchParams.get("streamId");
  const after = searchParams.get("after");
  if (!streamId) return NextResponse.json([]);

  const messages = await prisma.liveMessage.findMany({
    where: {
      liveStreamId: streamId,
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const { streamId, text, username, avatar } = await req.json();
  if (!streamId || !text || !username) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const msg = await prisma.liveMessage.create({
    data: { liveStreamId: streamId, text, username, avatar },
  });

  // Increment viewer count
  await prisma.liveStream.updateMany({
    where: { id: streamId, active: true },
    data: { viewers: { increment: 0 } },
  });

  return NextResponse.json(msg);
}
