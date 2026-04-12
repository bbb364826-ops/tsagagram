import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT: streamer sets offer for viewer; viewer sets answer; either adds ICE
export async function PUT(req: NextRequest, { params }: { params: { viewerId: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { viewerId } = params;
  const body = await req.json();
  const { streamId, offer, answer, streamerIce, viewerIce, status } = body;

  const signal = await (prisma as any).liveViewerSignal.findFirst({
    where: { viewerId, streamId },
  });
  if (!signal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};

  if (offer !== undefined) updateData.offer = offer;
  if (answer !== undefined) updateData.answer = answer;
  if (status !== undefined) updateData.status = status;

  // Append ICE candidates (stored as JSON arrays)
  if (streamerIce !== undefined) {
    const existing = JSON.parse(signal.streamerIce || "[]") as unknown[];
    existing.push(streamerIce);
    updateData.streamerIce = JSON.stringify(existing);
  }
  if (viewerIce !== undefined) {
    const existing = JSON.parse(signal.viewerIce || "[]") as unknown[];
    existing.push(viewerIce);
    updateData.viewerIce = JSON.stringify(existing);
  }

  const updated = await (prisma as any).liveViewerSignal.update({
    where: { id: signal.id },
    data: updateData,
  });
  return NextResponse.json(updated);
}

// DELETE: remove signal (viewer left or stream ended)
export async function DELETE(req: NextRequest, { params }: { params: { viewerId: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { viewerId } = params;
  const { searchParams } = new URL(req.url);
  const streamId = searchParams.get("streamId");

  await (prisma as any).liveViewerSignal.updateMany({
    where: { viewerId, streamId: streamId || undefined },
    data: { status: "ended" },
  });
  return NextResponse.json({ ok: true });
}
