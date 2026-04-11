import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET: list incoming follow requests
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json([], { status: 401 });

  const requests = await prisma.followRequest.findMany({
    where: { toId: session.userId },
    include: { from: { select: { id: true, username: true, avatar: true, name: true, _count: { select: { followers: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

// POST: accept or decline a request
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { requestId, action } = await req.json(); // action: "accept" | "decline"

  const request = await prisma.followRequest.findUnique({
    where: { id: requestId },
  });

  if (!request || request.toId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.followRequest.delete({ where: { id: requestId } });

  if (action === "accept") {
    await prisma.follow.create({
      data: { followerId: request.fromId, followingId: session.userId },
    });
    await prisma.notification.create({
      data: { type: "follow", receiverId: request.fromId, senderId: session.userId },
    });
  }

  return NextResponse.json({ ok: true, action });
}
