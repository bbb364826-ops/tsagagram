import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      // Send ping to keep alive
      send({ type: "connected" });

      let lastCheck = new Date();

      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); return; }
        try {
          const newMessages = await prisma.message.findMany({
            where: {
              receiverId: session.userId,
              createdAt: { gt: lastCheck },
            },
            include: { sender: { select: { id: true, username: true, avatar: true } } },
            orderBy: { createdAt: "asc" },
          });

          if (newMessages.length > 0) {
            lastCheck = new Date();
            send({ type: "messages", data: newMessages });
          } else {
            send({ type: "ping" });
          }
        } catch { clearInterval(interval); }
      }, 2000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
