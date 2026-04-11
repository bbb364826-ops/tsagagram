"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

interface Insights {
  likes: number; comments: number; saves: number; views: number; reach: number; engagement: string;
  likesPerDay: { date: string; count: number }[];
  topCommenters: { id: string; username: string; avatar?: string; commentCount: number }[];
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="flex-1 rounded-2xl p-4 flex flex-col items-center gap-1"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <span className="text-2xl">{icon}</span>
      <span className="text-xl font-bold" style={{ color: "var(--navy)" }}>{typeof value === "number" ? value.toLocaleString() : value}</span>
      <span className="text-xs" style={{ color: "var(--gray-mid)" }}>{label}</span>
    </div>
  );
}

export default function InsightsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    fetch(`/api/posts/${id}/insights`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); });
  }, [id, user]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
    </div>
  );

  if (!data) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <p className="text-4xl mb-3">🚫</p>
      <p className="font-semibold" style={{ color: "var(--navy)" }}>წვდომა უარყოფილია</p>
    </div>
  );

  const maxLikes = Math.max(...data.likesPerDay.map(d => d.count), 1);

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b sticky top-14 z-10"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <button onClick={() => router.back()} style={{ color: "var(--navy)" }}>
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 className="font-bold text-lg" style={{ color: "var(--navy)" }}>პოსტის ინსაიტები</h1>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Overview stats */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--gray-mid)" }}>მიმოხილვა</p>
          <div className="flex gap-2">
            <StatCard label="ნახვა" value={data.views} icon="👁️" />
            <StatCard label="охват" value={data.reach} icon="📡" />
            <StatCard label="Engagement" value={`${data.engagement}%`} icon="📊" />
          </div>
        </div>

        {/* Interaction stats */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--gray-mid)" }}>ინტერაქცია</p>
          <div className="flex gap-2">
            <StatCard label="მოწონება" value={data.likes} icon="❤️" />
            <StatCard label="კომენტარი" value={data.comments} icon="💬" />
            <StatCard label="შენახული" value={data.saves} icon="🔖" />
          </div>
        </div>

        {/* Likes per day chart */}
        <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-sm font-semibold mb-4" style={{ color: "var(--navy)" }}>Like-ები ბოლო 7 დღეში</p>
          <div className="flex items-end gap-1.5 h-28">
            {data.likesPerDay.map(({ date, count }) => (
              <div key={date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-semibold" style={{ color: "var(--gold)" }}>
                  {count > 0 ? count : ""}
                </span>
                <div className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${Math.max((count / maxLikes) * 80, count > 0 ? 4 : 0)}px`,
                    background: count > 0 ? "linear-gradient(to top, var(--navy), var(--gold))" : "var(--gray-light)",
                    minHeight: "2px",
                  }} />
                <span className="text-[9px]" style={{ color: "var(--gray-mid)" }}>{date.split(" ")[1] || date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top commenters */}
        {data.topCommenters.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <p className="text-sm font-semibold px-4 py-3 border-b" style={{ color: "var(--navy)", borderColor: "var(--border)" }}>
              ყველაზე აქტიური კომენტატორები
            </p>
            {data.topCommenters.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
                style={{ borderColor: "var(--border)" }}>
                <span className="text-sm font-bold w-5 text-center" style={{ color: "var(--gray-mid)" }}>
                  {i + 1}
                </span>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: "var(--navy)" }}>
                  {c.username?.[0]?.toUpperCase() ?? "?"}
                </div>
                <span className="flex-1 text-sm font-semibold" style={{ color: "var(--navy)" }}>@{c.username}</span>
                <span className="text-sm font-bold" style={{ color: "var(--gold)" }}>{c.commentCount} 💬</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
