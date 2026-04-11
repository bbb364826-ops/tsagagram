"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import StoryViewer from "./StoryViewer";

interface StoryItem {
  id: string; media: string; mediaType: string; caption?: string; createdAt: string; forClose?: boolean;
}
interface UserStories {
  id: string; username: string; avatar?: string; stories: StoryItem[];
}

export default function Stories() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<UserStories[]>([]);
  const [viewing, setViewing] = useState<number | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/stories").then(r => r.ok ? r.json() : []).then(setGroups).catch(() => {});
  }, []);

  const handleView = (i: number) => {
    const g = groups[i];
    setSeen(s => new Set([...s, g.id]));
    setViewing(i);
  };

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {/* Own story button */}
        <Link href="/camera" className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0">
          <div className="relative">
            <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden"
              style={{ background: "var(--gray-light)", border: "2px solid var(--border)" }}>
              {user?.avatar
                ? <Image src={user.avatar} alt="" width={64} height={64} className="object-cover w-full h-full rounded-full" />
                : <span className="text-2xl font-bold" style={{ color: "var(--navy)" }}>{user?.username?.[0]?.toUpperCase() || "+"}</span>}
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: "var(--gold)", border: "2px solid white" }}>+</div>
          </div>
          <span className="text-xs truncate w-16 text-center" style={{ color: "var(--navy)" }}>შენი ისტ.</span>
        </Link>

        {groups.map((g, i) => {
          const hasSeen = seen.has(g.id);
          const hasClose = g.stories.some(s => s.forClose);
          const ringBg = hasSeen
            ? "var(--border)"
            : hasClose
              ? "linear-gradient(45deg,#22c55e,#16a34a)"
              : "linear-gradient(45deg,var(--gold),var(--navy))";
          return (
            <button key={g.id} onClick={() => handleView(i)}
              className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0">
              <div className="p-0.5 rounded-full" style={{ background: ringBg }}>
                <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center"
                  style={{ background: "var(--card)", padding: "2px" }}>
                  <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
                    style={{ background: "var(--navy)" }}>
                    {g.avatar
                      ? <Image src={g.avatar} alt="" width={56} height={56} className="object-cover w-full h-full rounded-full" />
                      : <span className="text-white text-lg font-bold">{g.username[0].toUpperCase()}</span>}
                  </div>
                </div>
              </div>
              <span className="text-xs truncate w-16 text-center" style={{ color: "var(--navy)" }}>{g.username}</span>
            </button>
          );
        })}
      </div>

      {viewing !== null && groups[viewing] && (
        <StoryViewer
          groups={groups}
          startGroupIndex={viewing}
          onClose={() => setViewing(null)}
          onAdvance={(i) => { if (groups[i]) setSeen(s => new Set([...s, groups[i].id])); }}
        />
      )}
    </>
  );
}
