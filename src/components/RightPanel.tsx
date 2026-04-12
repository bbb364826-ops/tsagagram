"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";

interface SuggestedUser {
  id: string; username: string; name?: string; avatar?: string; verified?: boolean;
  reason?: string; _count: { followers: number };
}

export default function RightPanel() {
  const { user } = useAuth();
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
  const [following, setFollowing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/users/suggested")
      .then(r => r.ok ? r.json() : [])
      .then(setSuggested)
      .catch(() => {});
  }, []);

  const handleFollow = async (userId: string) => {
    setFollowing(f => ({ ...f, [userId]: !f[userId] }));
    await fetch("/api/follow", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: userId }),
    });
  };

  if (!user) return null;

  return (
    <div className="w-80 flex-shrink-0 pt-8">
      {/* Current user */}
      <Link href="/profile" className="flex items-center gap-3 mb-6 group">
        <div className="story-ring">
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-bold m-0.5"
            style={{ background: "var(--navy)" }}>
            {user.avatar
              ? <Image src={user.avatar} alt="" width={40} height={40} className="object-cover w-full h-full rounded-full" unoptimized />
              : user.username[0].toUpperCase()}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold group-hover:underline" style={{ color: "var(--navy)" }}>{user.username}</p>
          <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{user.name || "Tsagagram"}</p>
        </div>
      </Link>

      {/* Suggestions */}
      {suggested.length > 0 && (
        <>
          <div className="mb-4 flex justify-between items-center">
            <p className="text-sm font-semibold" style={{ color: "var(--gray-mid)" }}>შემოთავაზებული</p>
            <Link href="/explore" className="text-xs font-semibold" style={{ color: "var(--navy)" }}>ყველა ნახვა</Link>
          </div>

          <div className="flex flex-col gap-3">
            {suggested.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <Link href={`/u/${s.username}`} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: "var(--navy)" }}>
                    {s.avatar
                      ? <Image src={s.avatar} alt="" width={32} height={32} className="object-cover w-full h-full rounded-full" unoptimized />
                      : s.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-0.5">
                      <p className="text-xs font-semibold" style={{ color: "var(--navy)" }}>{s.username}</p>
                      {s.verified && <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--gold)"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                    </div>
                    <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{s.reason || `${s._count.followers} გამომყვ.`}</p>
                  </div>
                </Link>
                <button onClick={() => handleFollow(s.id)} className="text-xs font-semibold"
                  style={{ color: following[s.id] ? "var(--gray-mid)" : "var(--gold)" }}>
                  {following[s.id] ? "გამოწერილია" : "გამოჩენა"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="mt-8 text-xs" style={{ color: "var(--gray-mid)" }}>
        <p className="mb-2">
          {["შესახებ", "დახმარება", "პრესა", "API", "კარიერა", "კონფ."].join(" · ")}
        </p>
        <p>© 2026 Tsagagram</p>
      </div>
    </div>
  );
}
