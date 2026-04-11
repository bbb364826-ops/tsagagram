import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// In-memory typing store (works per-process, resets on restart)
const typingMap = new Map<string, { userId: string; expires: number }>();

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { recipientId } = await req.json();
  const key = `${session.userId}_${recipientId}`;
  typingMap.set(key, { userId: session.userId, expires: Date.now() + 4000 });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ typing: false });

  const senderId = req.nextUrl.searchParams.get("senderId");
  if (!senderId) return NextResponse.json({ typing: false });

  const key = `${senderId}_${session.userId}`;
  const entry = typingMap.get(key);
  if (!entry || entry.expires < Date.now()) {
    typingMap.delete(key);
    return NextResponse.json({ typing: false });
  }

  return NextResponse.json({ typing: true });
}
