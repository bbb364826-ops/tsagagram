import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json([], { status: 401 });

  const cookieStore = await cookies();
  const currentToken = cookieStore.get("token")?.value;

  const sessions = await prisma.session.findMany({
    where: { userId: session.userId },
    orderBy: { lastUsed: "desc" },
  });

  return NextResponse.json(sessions.map(s => ({
    ...s,
    isCurrent: s.token === currentToken,
  })));
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cookieStore = await cookies();
  const currentToken = cookieStore.get("token")?.value;

  // Delete all sessions except the current one
  await prisma.session.deleteMany({
    where: { userId: session.userId, token: { not: currentToken || "" } },
  });

  return NextResponse.json({ ok: true });
}
