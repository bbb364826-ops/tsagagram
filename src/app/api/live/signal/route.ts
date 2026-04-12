import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: viewer joins stream (creates signal record)
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { streamId } = await req.json();
  if (!streamId) return NextResponse.json({ error: "Missing streamId" }, { status: 400 });

  // Check if already has a signal record
  const existing = await (prisma as any).liveViewerSignal.findFirst({
    where: { streamId, viewerId: user.userId, status: { not: "ended" } },
  });
  if (existing) return NextResponse.json(existing);

  const signal = await (prisma as any).liveViewerSignal.create({
    data: { streamId, viewerId: user.userId },
  });
  return NextResponse.json(signal);
}

// GET: streamer polls for pending viewers; viewer polls for their offer
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const streamId = searchParams.get("streamId");
  const role = searchParams.get("role"); // "streamer" or "viewer"

  if (!streamId) return NextResponse.json({ error: "Missing streamId" }, { status: 400 });

  if (role === "streamer") {
    // Return all active viewer signals for this stream
    const signals = await (prisma as any).liveViewerSignal.findMany({
      where: { streamId, status: { not: "ended" } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(signals);
  }

  // Viewer: return their signal record
  const signal = await (prisma as any).liveViewerSignal.findFirst({
    where: { streamId, viewerId: user.userId, status: { not: "ended" } },
  });
  return NextResponse.json(signal || null);
}
