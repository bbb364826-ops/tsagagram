import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false });
  await prisma.user.update({
    where: { id: session.userId },
    data: { lastSeen: new Date() },
  }).catch(() => {});
  return NextResponse.json({ ok: true });
}
