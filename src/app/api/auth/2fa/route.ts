import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSecret, getOtpAuthUri, verifyTOTP } from "@/lib/totp";

// GET /api/auth/2fa → get current 2FA status + generate setup secret
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { totpEnabled: true, username: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Generate a new pending secret for setup (don't save yet)
  const pendingSecret = generateSecret();
  const uri = getOtpAuthUri(pendingSecret, user.username);

  return NextResponse.json({
    enabled: user.totpEnabled,
    pendingSecret,
    uri,
  });
}

// POST /api/auth/2fa { action: "enable"|"disable"|"verify", secret?, token }
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, secret, token } = await req.json();

  if (action === "enable") {
    // Verify token against the pending secret before enabling
    if (!secret || !token) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    if (!verifyTOTP(secret, token)) {
      return NextResponse.json({ error: "კოდი არასწორია" }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: session.userId },
      data: { totpSecret: secret, totpEnabled: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "disable") {
    // Require current token to disable
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { totpSecret: true },
    });
    if (user?.totpSecret && token && !verifyTOTP(user.totpSecret, token)) {
      return NextResponse.json({ error: "კოდი არასწორია" }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: session.userId },
      data: { totpSecret: null, totpEnabled: false },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
