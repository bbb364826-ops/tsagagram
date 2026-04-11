import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif",
  "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo",
  "audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4",
];
const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

async function uploadToCloudinary(buffer: Buffer, mimeType: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cloudinary = require("cloudinary").v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const resourceType = mimeType.startsWith("video/") ? "video"
    : mimeType.startsWith("audio/") ? "video" // cloudinary uses "video" for audio too
    : "image";

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: resourceType, folder: "tsagagram" },
      (err: unknown, result: { secure_url: string }) => {
        if (err) reject(err);
        else resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

async function saveLocally(buffer: Buffer, mimeType: string): Promise<string> {
  const { writeFile, mkdir } = await import("fs/promises");
  const { join } = await import("path");
  const MIME_TO_EXT: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif",
    "image/webp": "webp", "image/avif": "avif",
    "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
    "video/x-msvideo": "avi", "audio/webm": "webm", "audio/ogg": "ogg",
    "audio/mpeg": "mp3", "audio/mp4": "m4a",
  };
  const ext = MIME_TO_EXT[mimeType] || "bin";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const uploadsDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(join(uploadsDir, filename), buffer);
  return `/uploads/${filename}`;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.formData();
  const file = data.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "ფაილი არ არის" }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "მხოლოდ სურათი, ვიდეო ან აუდიო" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "ფაილი 100MB-ზე მეტია" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  let url: string;
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    url = await uploadToCloudinary(buffer, file.type);
  } else {
    url = await saveLocally(buffer, file.type);
  }

  return NextResponse.json({ url, type: file.type });
}
