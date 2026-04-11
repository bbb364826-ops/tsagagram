"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { useRouter } from "next/navigation";

interface Post {
  id: string; images: string[]; createdAt: string;
  _count: { likes: number; comments: number };
}

export default function ArchivePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [unarchiving, setUnarchiving] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    fetch("/api/posts/archive").then(r => r.json()).then(setPosts).finally(() => setLoading(false));
  }, [user]);

  const unarchive = async (postId: string) => {
    setUnarchiving(postId);
    await fetch("/api/posts/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });
    setPosts(p => p.filter(x => x.id !== postId));
    setUnarchiving(null);
  };

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b sticky top-14 z-10"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <button onClick={() => router.back()} style={{ color: "var(--navy)" }}>
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 className="font-bold text-lg" style={{ color: "var(--navy)" }}>არქივი</h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-0.5 mt-0.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse" style={{ background: "var(--gray-light)" }} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <p className="text-5xl mb-4">🗃️</p>
          <p className="font-semibold text-lg mb-1" style={{ color: "var(--navy)" }}>არქივი ცარიელია</p>
          <p className="text-sm text-center" style={{ color: "var(--gray-mid)" }}>
            დამალული პოსტები გამოჩნდება აქ. სხვები ვერ ნახავენ.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5">
          {posts.map(p => {
            const src = p.images?.[0];
            const isVideo = src?.match(/\.(mp4|webm|mov)$/i);
            return (
              <div key={p.id} className="relative aspect-square group">
                {src ? (
                  isVideo
                    ? <video src={src} muted className="w-full h-full object-cover" />
                    : <Image src={src} alt="" fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--gray-light)" }}>📷</div>
                )}
                {/* Overlay */}
                <div className="absolute inset-0 opacity-0 group-active:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity"
                  style={{ background: "rgba(0,0,0,0.5)" }}>
                  <Link href={`/p/${p.id}`} className="px-4 py-1.5 rounded-full text-xs font-semibold text-white"
                    style={{ background: "rgba(255,255,255,0.2)" }}>ნახვა</Link>
                  <button onClick={() => unarchive(p.id)} disabled={unarchiving === p.id}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold"
                    style={{ background: "var(--gold)", color: "white" }}>
                    {unarchiving === p.id ? "..." : "გამოაქვეყნე"}
                  </button>
                </div>
                {isVideo && (
                  <div className="absolute top-1.5 right-1.5">
                    <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
