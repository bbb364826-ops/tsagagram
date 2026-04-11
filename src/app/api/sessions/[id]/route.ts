import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const s = await prisma.session.findUnique({ where: { id } });
  if (!s || s.userId !== session.userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.session.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
