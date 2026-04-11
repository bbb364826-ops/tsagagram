"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";

const MapWithNoSSR = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => (
  <div className="flex items-center justify-center h-full">
    <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
  </div>
) });

export interface MapPost {
  id: string; images: string[]; caption?: string; lat: number; lng: number;
  user: { username: string; avatar?: string };
  _count: { likes: number; comments: number };
}

export default function MapPage() {
  const [posts, setPosts] = useState<MapPost[]>([]);
  const [selected, setSelected] = useState<MapPost | null>(null);

  useEffect(() => {
    fetch("/api/posts/map").then(r => r.ok ? r.json() : []).then(d => setPosts(Array.isArray(d) ? d : []));
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "var(--background)" }}>
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        <h1 className="text-lg font-bold" style={{ color: "var(--navy)" }}>📍 Photo Map</h1>
        <span className="text-sm" style={{ color: "var(--gray-mid)" }}>{posts.length} posts with locations</span>
      </div>

      <div className="flex-1 relative">
        <MapWithNoSSR posts={posts} onSelect={setSelected} />
      </div>

      {selected && (
        <div className="absolute bottom-20 left-4 right-4 rounded-2xl overflow-hidden shadow-xl z-[1000]"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex gap-3 p-3">
            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative">
              <Image src={selected.images[0]} alt="" fill className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  {selected.user.avatar ? <Image src={selected.user.avatar} alt="" width={24} height={24} className="object-cover" /> : null}
                </div>
                <span className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{selected.user.username}</span>
              </div>
              {selected.caption && <p className="text-xs truncate mb-2" style={{ color: "var(--gray-mid)" }}>{selected.caption}</p>}
              <div className="flex gap-3 text-xs" style={{ color: "var(--gray-mid)" }}>
                <span>❤️ {selected._count.likes}</span>
                <span>💬 {selected._count.comments}</span>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="p-1 self-start" style={{ color: "var(--gray-mid)" }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
