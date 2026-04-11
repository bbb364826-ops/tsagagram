import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// End a live stream
export async function DELETE(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { streamId } = await req.json();
  await prisma.liveStream.updateMany({
    where: { id: streamId, userId: session.userId },
    data: { active: false, endedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
