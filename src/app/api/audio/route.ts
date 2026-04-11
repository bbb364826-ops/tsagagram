import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const tracks = await prisma.audio.findMany({ orderBy: { title: "asc" } });
  return NextResponse.json(tracks);
}

export async function POST() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Seed demo tracks if empty
  const count = await prisma.audio.count();
  if (count === 0) {
    await prisma.audio.createMany({
      data: [
        { title: "Tbilisi Night", artist: "DJ Kavkaz", url: "/audio/tbilisi-night.mp3", duration: 180 },
        { title: "Georgian Soul", artist: "Rustavi Ensemble", url: "/audio/georgian-soul.mp3", duration: 240 },
        { title: "Mountain Echo", artist: "Nino & Band", url: "/audio/mountain-echo.mp3", duration: 200 },
        { title: "City Vibes", artist: "TbilisiBeats", url: "/audio/city-vibes.mp3", duration: 160 },
        { title: "Summer in Batumi", artist: "Black Sea Waves", url: "/audio/summer-batumi.mp3", duration: 210 },
      ],
    });
  }
  return NextResponse.json({ ok: true });
}
