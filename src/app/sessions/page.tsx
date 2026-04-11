"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { useRouter } from "next/navigation";

interface Session {
  id: string; device?: string; ip?: string; createdAt: string; lastUsed: string; isCurrent: boolean;
}

function DeviceIcon({ device }: { device?: string }) {
  if (device === "Mobile") return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--navy)" }}>
      <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  );
  if (device === "Tablet") return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--navy)" }}>
      <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  );
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--navy)" }}>
      <rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d} დღის წინ`; if (h > 0) return `${h} საათის წინ`; if (m > 0) return `${m} წუთის წინ`; return "ახლახან";
}

export default function SessionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    fetch("/api/sessions").then(r => r.json()).then(setSessions).finally(() => setLoading(false));
  }, [user]);

  const revokeSession = async (id: string) => {
    setRevoking(id);
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    setSessions(s => s.filter(x => x.id !== id));
    setRevoking(null);
  };

  const revokeAll = async () => {
    await fetch("/api/sessions", { method: "DELETE" });
    setSessions(s => s.filter(x => x.isCurrent));
  };

  const otherSessions = sessions.filter(s => !s.isCurrent);

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b sticky top-14 z-10"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <button onClick={() => router.back()} style={{ color: "var(--navy)" }}>
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 className="font-bold text-lg flex-1" style={{ color: "var(--navy)" }}>აქტიური სესიები</h1>
        {otherSessions.length > 0 && (
          <button onClick={revokeAll} className="text-sm font-semibold" style={{ color: "#e8534a" }}>
            ყველას გამოსვლა
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
        </div>
      ) : (
        <div className="p-4 flex flex-col gap-3">
          {/* Current session */}
          {sessions.filter(s => s.isCurrent).map(s => (
            <div key={s.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="px-4 py-2 text-xs font-semibold" style={{ background: "var(--gold)", color: "white" }}>
                მიმდინარე სესია
              </div>
              <div className="flex items-center gap-4 px-4 py-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--gray-light)" }}>
                  <DeviceIcon device={s.device} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{s.device || "Desktop"}</p>
                  <p className="text-xs" style={{ color: "var(--gray-mid)" }}>IP: {s.ip || "Unknown"}</p>
                  <p className="text-xs" style={{ color: "var(--gray-mid)" }}>შესვლა: {timeAgo(s.createdAt)}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
            </div>
          ))}

          {/* Other sessions */}
          {otherSessions.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <p className="px-4 py-3 text-xs font-semibold border-b" style={{ color: "var(--gray-mid)", borderColor: "var(--border)" }}>
                სხვა სესიები ({otherSessions.length})
              </p>
              {otherSessions.map((s, i) => (
                <div key={s.id} className={`flex items-center gap-4 px-4 py-4 ${i < otherSessions.length - 1 ? "border-b" : ""}`}
                  style={{ borderColor: "var(--border)" }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--gray-light)" }}>
                    <DeviceIcon device={s.device} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{s.device || "Desktop"}</p>
                    <p className="text-xs" style={{ color: "var(--gray-mid)" }}>IP: {s.ip || "Unknown"}</p>
                    <p className="text-xs" style={{ color: "var(--gray-mid)" }}>ბოლო: {timeAgo(s.lastUsed)}</p>
                  </div>
                  <button onClick={() => revokeSession(s.id)} disabled={revoking === s.id}
                    className="text-sm font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: "var(--gray-light)", color: "#e8534a" }}>
                    {revoking === s.id ? "..." : "გამოსვლა"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {sessions.length === 0 && (
            <div className="text-center py-12" style={{ color: "var(--gray-mid)" }}>
              <p className="text-4xl mb-3">🔐</p>
              <p className="text-sm">სესიები ვერ მოიძებნა</p>
            </div>
          )}

          <p className="text-xs text-center" style={{ color: "var(--gray-mid)" }}>
            თუ უცნობი სესია გხედავს, გამოდი და პაროლი შეცვალე
          </p>
        </div>
      )}
    </div>
  );
}
