import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST: caller initiates call with offer SDP
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { calleeId, mode, offer } = await req.json();
    if (!calleeId || !offer) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    // End any previous active calls
    await prisma.callSession.updateMany({
      where: {
        OR: [{ callerId: session.userId }, { calleeId: session.userId }],
        status: { in: ["ringing", "active"] },
      },
      data: { status: "ended" },
    });

    const call = await prisma.callSession.create({
      data: { callerId: session.userId, calleeId, mode: mode || "audio", offer: JSON.stringify(offer), status: "ringing" },
    });

    return NextResponse.json({ callId: call.id });
  } catch (err) {
    console.error("[CALL POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// GET: callee checks for incoming calls
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json(null);

  const call = await prisma.callSession.findFirst({
    where: { calleeId: session.userId, status: "ringing" },
    include: { caller: { select: { id: true, username: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (!call) return NextResponse.json(null);
  return NextResponse.json({
    callId: call.id,
    caller: call.caller,
    mode: call.mode,
    offer: JSON.parse(call.offer || "null"),
  });
}
