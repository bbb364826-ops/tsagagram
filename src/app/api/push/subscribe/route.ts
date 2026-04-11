import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscription = await req.json();
  if (!subscription?.endpoint) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });

  await prisma.user.update({
    where: { id: session.userId },
    data: { pushSubscription: JSON.stringify(subscription) },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({ where: { id: session.userId }, data: { pushSubscription: null } });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
}
