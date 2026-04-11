"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";

interface Reel {
  id: string;
  images: string[];
  caption?: string;
  createdAt: string;
  isLiked: boolean;
  user: { id: string; username: string; avatar?: string; verified?: boolean };
  _count: { likes: number; comments: number };
}

export default function Reels() {
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [current, setCurrent] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const [heartAnims, setHeartAnims] = useState<Record<string, boolean>>({});
  const touchStartY = useRef(0);
  const lastTap = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const loadReels = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/posts/foryou?limit=20&offset=0");
    if (res.ok) {
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setReels(arr);
      const likedMap: Record<string, boolean> = {};
      const countMap: Record<string, number> = {};
      arr.forEach((r: Reel) => { likedMap[r.id] = r.isLiked; countMap[r.id] = r._count.likes; });
      setLiked(likedMap);
      setLikeCounts(countMap);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadReels(); }, [loadReels]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [current]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) < 50) return;
    if (diff > 0 && current < reels.length - 1) setCurrent(c => c + 1);
    if (diff < 0 && current > 0) setCurrent(c => c - 1);
  };

  const handleLike = async (id: string) => {
    const wasLiked = liked[id];
    setLiked(l => ({ ...l, [id]: !wasLiked }));
    setLikeCounts(c => ({ ...c, [id]: (c[id] || 0) + (wasLiked ? -1 : 1) }));
    await fetch(`/api/posts/${id}/like`, { method: "POST" });
  };

  const handleSave = async (id: string) => {
    setSaved(s => ({ ...s, [id]: !s[id] }));
    await fetch(`/api/posts/${id}/save`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
  };

  const handleDoubleTap = (id: string) => {
    const now = Date.now();
    if (now - lastTap.current < 350) {
      if (!liked[id]) handleLike(id);
      setHeartAnims(h => ({ ...h, [id]: true }));
      setTimeout(() => setHeartAnims(h => ({ ...h, [id]: false })), 900);
    }
    lastTap.current = now;
  };

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 pt-14 pb-16 flex items-center justify-center" style={{ background: "#000" }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="fixed inset-0 pt-14 pb-16 flex flex-col items-center justify-center" style={{ background: "#000" }}>
        <p className="text-white text-5xl mb-4">🎬</p>
        <p className="text-white font-semibold">Reels არ არის</p>
        <p className="text-white/60 text-sm mt-1">ჯერ არ გამოქვეყნებულა ვიდეო</p>
        <Link href="/create" className="mt-4 px-6 py-2 rounded-full text-sm font-semibold"
          style={{ background: "var(--gold)", color: "white" }}>
          Reel-ის დამატება
        </Link>
      </div>
    );
  }

  const reel = reels[current];
  const src = reel.images[0];
  const isVideo = src?.match(/\.(mp4|webm|mov)$/i);

  return (
    <div className="fixed inset-0 pt-14 pb-16 overflow-hidden touch-none"
      style={{ background: "#000" }}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

      {/* Media */}
      <div className="absolute inset-0" onClick={() => handleDoubleTap(reel.id)}>
        {isVideo ? (
          <video ref={videoRef} src={src} autoPlay muted={muted} loop playsInline
            className="w-full h-full object-cover" />
        ) : src ? (
          <Image src={src} alt={reel.caption || "reel"} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl"
            style={{ background: "linear-gradient(180deg,#1b2d5b,#c9a84c)" }}>🎬</div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.7) 100%)" }} />
        {heartAnims[reel.id] && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-8xl drop-shadow-lg" style={{ animation: "heartPop 0.8s ease-out forwards" }}>❤️</div>
          </div>
        )}
      </div>
      {/* Mute button */}
      <button onClick={() => setMuted(m => !m)}
        className="absolute top-16 right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.5)" }}>
        {muted
          ? <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M16.5 12A4.5 4.5 0 0014 7.97V9.5l2.45 2.45c.03-.15.05-.31.05-.45zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0019.73 19L21 17.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
          : <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>}
      </button>

      {/* Progress indicators */}
      <div className="absolute top-3 left-4 right-4 flex gap-1 z-10">
        {reels.slice(Math.max(0, current - 2), Math.min(reels.length, current + 3)).map((_, i) => {
          const actualI = Math.max(0, current - 2) + i;
          return (
            <div key={actualI} className="flex-1 h-0.5 rounded-full" style={{
              background: actualI === current ? "white" : actualI < current ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)"
            }} />
          );
        })}
      </div>

      {/* Right actions */}
      <div className="absolute right-4 bottom-28 flex flex-col items-center gap-6 z-10">
        {/* Avatar */}
        <Link href={`/u/${reel.user.username}`} className="flex flex-col items-center" onClick={e => e.stopPropagation()}>
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-bold border-2 border-white"
            style={{ background: "var(--navy)" }}>
            {reel.user.avatar
              ? <Image src={reel.user.avatar} alt="" width={40} height={40} className="object-cover w-full h-full rounded-full" />
              : reel.user.username[0].toUpperCase()}
          </div>
          {user && user.id !== reel.user.id && (
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold -mt-2.5"
              style={{ background: "var(--gold)", border: "2px solid white" }}>+</div>
          )}
        </Link>

        {/* Like */}
        <button onClick={() => handleLike(reel.id)} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
          <svg width="30" height="30" fill={liked[reel.id] ? "#e8534a" : "none"} stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
          <span className="text-white text-xs font-semibold">{formatCount(likeCounts[reel.id] || 0)}</span>
        </button>

        {/* Comments */}
        <Link href={`/p/${reel.id}`} className="flex flex-col items-center gap-1">
          <svg width="28" height="28" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span className="text-white text-xs font-semibold">{formatCount(reel._count.comments)}</span>
        </Link>

        {/* Save */}
        <button onClick={() => handleSave(reel.id)} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
          <svg width="26" height="26" fill={saved[reel.id] ? "white" : "none"} stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
        </button>

        {/* Share */}
        <button className="flex flex-col items-center gap-1">
          <svg width="28" height="28" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-8 left-4 right-20 z-10">
        <Link href={`/u/${reel.user.username}`} className="flex items-center gap-2 mb-1">
          <span className="text-white font-bold text-sm">@{reel.user.username}</span>
          {reel.user.verified && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--gold)">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </Link>
        {reel.caption && (
          <p className="text-white text-sm opacity-90 line-clamp-2">{reel.caption}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <div className="w-4 h-4 rounded-full border-2 border-white animate-spin" style={{ animationDuration: "3s", background: "var(--gold)" }} />
          <span className="text-white text-xs opacity-80 flex-1 truncate">🎵 Original Audio · {reel.user.username}</span>
        </div>
      </div>
      <style>{`@keyframes heartPop { 0%{transform:scale(0);opacity:1} 50%{transform:scale(1.3);opacity:1} 100%{transform:scale(1);opacity:0} }`}</style>

      {/* Navigation arrows (keyboard/desktop) */}
      {current > 0 && (
        <button onClick={() => setCurrent(c => c - 1)}
          className="absolute left-1/2 top-20 -translate-x-1/2 z-10 hidden sm:flex items-center justify-center w-8 h-8 rounded-full"
          style={{ background: "rgba(255,255,255,0.2)" }}>
          <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 15l-6-6-6 6" /></svg>
        </button>
      )}
      {current < reels.length - 1 && (
        <button onClick={() => setCurrent(c => c + 1)}
          className="absolute left-1/2 bottom-20 -translate-x-1/2 z-10 flex items-center flex-col animate-bounce">
          <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
          <span className="text-white text-xs opacity-70">swipe up</span>
        </button>
      )}
    </div>
  );
}
