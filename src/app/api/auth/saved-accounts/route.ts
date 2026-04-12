import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, signToken } from "@/lib/auth";

// List saved accounts
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json([], { status: 401 });

  const accounts = await prisma.savedAccount.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(accounts);
}

// Save current account token for later switching
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, avatar: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const token = signToken({ userId: user.id, username: user.username });

  await prisma.savedAccount.upsert({
    where: { userId_username: { userId: session.userId, username: user.username } },
    update: { token, avatar: user.avatar || null },
    create: { userId: session.userId, username: user.username, token, avatar: user.avatar || null },
  });

  return NextResponse.json({ ok: true });
}

// Switch to a saved account (by username)
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await req.json();
  const saved = await prisma.savedAccount.findFirst({
    where: { userId: session.userId, username },
  });
  if (!saved) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  // Set the saved account's token as the new session
  const res = NextResponse.json({ ok: true, username });
  res.cookies.set("token", saved.token, { httpOnly: true, maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax" });
  return res;
}

// Remove a saved account
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await req.json();
  await prisma.savedAccount.deleteMany({ where: { userId: session.userId, username } });
  return NextResponse.json({ ok: true });
}
