"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import Image from "next/image";

interface IncomingCall {
  callId: string;
  caller: { id: string; username: string; avatar?: string };
  mode: string;
}

export default function GlobalCallListener() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    // Don't poll if already on a call page
    if (pathname.startsWith("/call/")) return;

    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch("/api/call");
        if (!r.ok) return;
        const data = await r.json();
        if (data?.callId) setIncomingCall(data);
      } catch {}
    }, 3000);

    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [user, pathname]);

  if (!incomingCall) return null;

  const reject = async () => {
    await fetch(`/api/call/${incomingCall.callId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    }).catch(() => {});
    setIncomingCall(null);
  };

  const accept = () => {
    const { callId, caller, mode } = incomingCall;
    setIncomingCall(null);
    router.push(`/call/${caller.id}?mode=${mode}&callId=${callId}`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="rounded-3xl p-8 flex flex-col items-center gap-5 shadow-2xl mx-4" style={{ background: "var(--card)", minWidth: 280 }}>
        <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-3xl flex-shrink-0" style={{ background: "var(--navy)" }}>
          {incomingCall.caller.avatar
            ? <Image src={incomingCall.caller.avatar} alt="" width={80} height={80} className="w-full h-full object-cover rounded-full" unoptimized />
            : incomingCall.caller.username[0].toUpperCase()}
        </div>
        <div className="text-center">
          <p className="font-bold text-lg" style={{ color: "var(--navy)" }}>@{incomingCall.caller.username}</p>
          <p className="text-sm" style={{ color: "var(--gray-mid)" }}>
            {incomingCall.mode === "video" ? "📹 ვიდეო ზარი" : "📞 ხმოვანი ზარი"}
          </p>
        </div>
        <div className="flex gap-6">
          <button onClick={reject}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-red-500">
            <svg width="28" height="28" fill="white" viewBox="0 0 24 24">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.25.2 2.45.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
            </svg>
          </button>
          <button onClick={accept}
            className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#22c55e" }}>
            <svg width="28" height="28" fill="white" viewBox="0 0 24 24">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.25.2 2.45.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
            </svg>
          </button>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: "var(--gold)", animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
