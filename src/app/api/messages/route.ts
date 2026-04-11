import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Get all conversations (latest message per user). ?requests=1 returns only request conversations.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json([], { status: 401 });

  const onlyRequests = req.nextUrl.searchParams.get("requests") === "1";

  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: session.userId }, { receiverId: session.userId }],
    },
    include: {
      sender: { select: { id: true, username: true, avatar: true } },
      receiver: { select: { id: true, username: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by conversation partner (latest msg per partner)
  const convMap = new Map<string, typeof messages[0]>();
  for (const msg of messages) {
    const partner = msg.senderId === session.userId ? msg.receiver : msg.sender;
    if (!convMap.has(partner.id)) convMap.set(partner.id, msg);
  }

  // A conversation is a "request" if the latest incoming message (to me) is still isRequest=true
  const conversations = Array.from(convMap.values())
    .map(msg => {
      const partner = msg.senderId === session.userId ? msg.receiver : msg.sender;
      const isIncoming = msg.receiverId === session.userId;
      const isRequest = isIncoming && msg.isRequest;
      return {
        user: partner,
        lastMessage: msg.text,
        lastTime: msg.createdAt,
        unread: !msg.read && isIncoming,
        isRequest,
      };
    })
    .filter(c => onlyRequests ? c.isRequest : !c.isRequest);

  return NextResponse.json(conversations);
}

// Accept a message request from userId
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, action } = await req.json(); // action: "accept" | "decline"
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  if (action === "decline") {
    // Delete all messages from this sender to me
    await prisma.message.deleteMany({ where: { senderId: userId, receiverId: session.userId } });
    return NextResponse.json({ ok: true });
  }

  // Accept: mark all their messages as no longer requests
  await prisma.message.updateMany({
    where: { senderId: userId, receiverId: session.userId, isRequest: true },
    data: { isRequest: false },
  });
  return NextResponse.json({ ok: true });
}
