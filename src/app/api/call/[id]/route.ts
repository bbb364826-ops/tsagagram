import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET: poll call state (offer, answer, ice candidates)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const call = await prisma.callSession.findUnique({ where: { id } });
  if (!call) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isCaller = call.callerId === session.userId;
  const isCallee = call.calleeId === session.userId;
  if (!isCaller && !isCallee) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({
    status: call.status,
    offer: call.offer ? JSON.parse(call.offer) : null,
    answer: call.answer ? JSON.parse(call.answer) : null,
    // Return the OTHER party's ICE candidates
    remoteIce: JSON.parse(isCaller ? call.calleeIce : call.callerIce),
  });
}

// PUT: update call (answer, ICE candidates, status)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const call = await prisma.callSession.findUnique({ where: { id } });
  if (!call) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isCaller = call.callerId === session.userId;
  const isCallee = call.calleeId === session.userId;
  if (!isCaller && !isCallee) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  const updateData: Record<string, unknown> = {};

  // Callee submits answer
  if (body.answer && isCallee) {
    updateData.answer = JSON.stringify(body.answer);
    updateData.status = "active";
  }

  // Add ICE candidate
  if (body.ice) {
    const field = isCaller ? "callerIce" : "calleeIce";
    const existing = JSON.parse(isCaller ? call.callerIce : call.calleeIce);
    existing.push(body.ice);
    updateData[field] = JSON.stringify(existing);
  }

  // Status update (reject, end)
  if (body.status) {
    updateData.status = body.status;
  }

  await prisma.callSession.update({ where: { id }, data: updateData });
  return NextResponse.json({ ok: true });
}

// DELETE: end call
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.callSession.updateMany({
    where: { id, OR: [{ callerId: session.userId }, { calleeId: session.userId }] },
    data: { status: "ended" },
  });

  return NextResponse.json({ ok: true });
}
