"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

interface Request {
  id: string;
  from: { id: string; username: string; avatar?: string; name?: string; _count: { followers: number } };
}

export default function FollowRequestsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [processing, setProcessing] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user) load();
  }, [user, loading]);

  const load = async () => {
    const res = await fetch("/api/follow/requests");
    if (res.ok) setRequests(await res.json());
  };

  const handle = async (requestId: string, action: "accept" | "decline") => {
    setProcessing(prev => new Set(prev).add(requestId));
    await fetch("/api/follow/requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action }),
    });
    setRequests(prev => prev.filter(r => r.id !== requestId));
    setProcessing(prev => { const s = new Set(prev); s.delete(requestId); return s; });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
    </div>
  );

  return (
    <div style={{ background: "var(--card)", minHeight: "100vh" }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <button onClick={() => router.back()} style={{ color: "var(--navy)" }}>
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <p className="font-bold text-base" style={{ color: "var(--navy)" }}>Follow მოთხოვნები</p>
        {requests.length > 0 && (
          <span className="ml-1 text-sm font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--gold)", color: "white" }}>{requests.length}</span>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "var(--gray-light)" }}>
            <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: "var(--navy)" }}>
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM19 8v6M22 11h-6"/>
            </svg>
          </div>
          <p className="font-semibold" style={{ color: "var(--navy)" }}>Follow მოთხოვნები არ არის</p>
          <p className="text-sm" style={{ color: "var(--gray-mid)" }}>ახალი მოთხოვნები აქ გამოჩნდება</p>
        </div>
      ) : (
        <div>
          {requests.map(req => (
            <div key={req.id} className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <Link href={`/u/${req.from.username}`} className="flex items-center gap-3 flex-1">
                <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: "var(--navy)" }}>
                  {req.from.avatar
                    ? <Image src={req.from.avatar} alt="" width={48} height={48} className="object-cover w-full h-full" unoptimized />
                    : req.from.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{req.from.username}</p>
                  {req.from.name && <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{req.from.name}</p>}
                  <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{req.from._count.followers} გამომყოლი</p>
                </div>
              </Link>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => handle(req.id, "accept")}
                  disabled={processing.has(req.id)}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
                  დამტკ.
                </button>
                <button onClick={() => handle(req.id, "decline")}
                  disabled={processing.has(req.id)}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                  style={{ background: "var(--gray-light)", color: "var(--navy)" }}>
                  უარი
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
