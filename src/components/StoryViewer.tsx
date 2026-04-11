"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";

const DURATION = 5000;

interface StoryStickerData {
  id: number; emoji: string; x: number; y: number; type?: "emoji" | "music" | "url" | "poll" | "question" | "countdown" | "slider" | "addyours";
  text?: string; options?: string[]; question?: string; endDate?: string; min?: string; max?: string;
}
interface StoryItem {
  id: string; media: string; mediaType: string; caption?: string; createdAt: string; stickers?: string; forClose?: boolean;
}
interface UserStories {
  id: string; username: string; avatar?: string; stories: StoryItem[];
}
interface Viewer { id: string; username: string; avatar?: string }

function CountdownSticker({ endDate, label }: { endDate: string; label: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("დასრულდა"); return; }
      const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(d > 0 ? `${d}დ ${h}სთ` : `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    };
    update(); const t = setInterval(update, 1000); return () => clearInterval(t);
  }, [endDate]);
  return (
    <div className="px-4 py-3 rounded-2xl text-center" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", minWidth: "160px" }}>
      <p className="text-white text-xs font-semibold mb-1">{label}</p>
      <p className="text-white text-xl font-bold font-mono">{timeLeft}</p>
    </div>
  );
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) { const m = Math.floor(diff / 60000); return m < 1 ? "ახლახან" : `${m} წთ`; }
  if (h < 24) return `${h} სთ`;
  return `${Math.floor(h / 24)} დ`;
}

export default function StoryViewer({ groups, startGroupIndex, onClose, onAdvance }: {
  groups: UserStories[];
  startGroupIndex: number;
  onClose: () => void;
  onAdvance?: (index: number) => void;
}) {
  const { user } = useAuth();
  const [groupIdx, setGroupIdx] = useState(startGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState("");
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [viewCount, setViewCount] = useState(0);
  const [pollVotes, setPollVotes] = useState<Record<string, number>>({});
  const [sliderVal, setSliderVal] = useState(50);
  const [questionReply, setQuestionReply] = useState("");
  const [questionSent, setQuestionSent] = useState(false);
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];
  const isOwn = user?.id === group?.id;

  const goNext = () => {
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx(i => i + 1);
      setProgress(0);
    } else if (groupIdx < groups.length - 1) {
      const next = groupIdx + 1;
      setGroupIdx(next);
      setStoryIdx(0);
      setProgress(0);
      onAdvance?.(next);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (storyIdx > 0) { setStoryIdx(i => i - 1); setProgress(0); }
    else if (groupIdx > 0) { setGroupIdx(i => i - 1); setStoryIdx(0); setProgress(0); }
  };

  // Record view + fetch viewer count when story changes
  useEffect(() => {
    if (!story) return;
    // Record view
    if (!isOwn) {
      fetch(`/api/stories/${story.id}/views`, { method: "POST" }).catch(() => {});
    }
    // Fetch view count for own stories
    if (isOwn) {
      fetch(`/api/stories/${story.id}/views`)
        .then(r => r.ok ? r.json() : [])
        .then(data => { setViewers(data.map((v: { user: Viewer }) => v.user)); setViewCount(data.length); })
        .catch(() => {});
    }
    setShowViewers(false);
  }, [story?.id]);

  useEffect(() => {
    if (paused || !story) return;
    setProgress(0);
    const start = Date.now();
    const timer = setInterval(() => {
      const p = ((Date.now() - start) / DURATION) * 100;
      if (p >= 100) { clearInterval(timer); goNext(); }
      else setProgress(p);
    }, 50);
    return () => clearInterval(timer);
  }, [groupIdx, storyIdx, paused]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
    setPaused(true);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    setPaused(false);
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dt = Date.now() - touchStartTime.current;
    if (dt < 200 && Math.abs(dx) < 10) {
      const x = e.changedTouches[0].clientX;
      if (x < window.innerWidth / 3) goPrev(); else goNext();
    } else if (Math.abs(dx) > 50) {
      if (dx < 0 && groupIdx < groups.length - 1) {
        const next = groupIdx + 1; setGroupIdx(next); setStoryIdx(0); setProgress(0); onAdvance?.(next);
      } else if (dx > 0 && groupIdx > 0) {
        setGroupIdx(i => i - 1); setStoryIdx(0); setProgress(0);
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const x = e.clientX;
    if (x < window.innerWidth / 3) goPrev(); else goNext();
  };

  const handleReply = async () => {
    if (!reply.trim() || !story) return;
    // Send story media as mediaUrl context + text reply so chat shows the story thumbnail
    const replyText = reply.trim();
    setReply("");
    await fetch(`/api/messages/${group.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: replyText,
        mediaUrl: story.mediaType === "image" ? story.media : undefined,
        storyReply: true,
      }),
    });
  };

  if (!group || !story) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "#000" }}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="relative w-full max-w-sm h-full flex flex-col" onClick={handleClick}>
        {/* Media */}
        <div className="absolute inset-0">
          {story.mediaType === "video"
            ? <video src={story.media} autoPlay muted loop playsInline className="w-full h-full object-cover" />
            : <Image src={story.media} alt="" fill className="object-cover" unoptimized />}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.5) 100%)" }} />
        </div>

        {/* Progress bars */}
        <div className="relative flex gap-1 px-3 pt-12 pb-2 z-10">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.35)" }}>
              <div className="h-full rounded-full" style={{
                background: "white",
                width: i < storyIdx ? "100%" : i === storyIdx ? `${progress}%` : "0%",
              }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="relative flex items-center gap-3 px-4 py-2 z-10" onClick={e => e.stopPropagation()}>
          <Link href={`/u/${group.username}`} onClick={onClose} className="flex items-center gap-2 flex-1">
            <div className="relative w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white font-bold"
              style={{ background: "rgba(255,255,255,0.2)" }}>
              {group.avatar
                ? <Image src={group.avatar} alt="" width={36} height={36} className="object-cover w-full h-full rounded-full" />
                : group.username[0].toUpperCase()}
            </div>
            <span className="text-white font-semibold text-sm">{group.username}</span>
            {story.forClose && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{ background: "#22c55e", color: "white", fontSize: "10px" }}>
                👥 Close
              </span>
            )}
            <span className="text-white text-xs opacity-70">{timeAgo(story.createdAt)}</span>
          </Link>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-white ml-2">
            <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Stickers overlay */}
        {story.stickers && (() => {
          let stickers: StoryStickerData[] = [];
          try { stickers = JSON.parse(story.stickers); } catch { return null; }
          return stickers.map(s => (
            <div key={s.id} className="absolute z-10 pointer-events-auto"
              style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, transform: "translate(-50%,-50%)" }}
              onClick={e => e.stopPropagation()}>
              {(!s.type || s.type === "emoji") && (
                <span className="text-4xl drop-shadow-lg select-none">{s.emoji}</span>
              )}
              {s.type === "music" && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-full text-white text-xs font-semibold"
                  style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}>
                  <div className="w-4 h-4 rounded-full border-2 border-white animate-spin" style={{ animationDuration: "3s" }} />
                  {s.text || s.emoji}
                </div>
              )}
              {s.type === "url" && (
                <a href={s.text} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-white text-xs font-semibold"
                  style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", maxWidth: "200px" }}>
                  <span>🔗</span><span className="truncate">{s.text}</span>
                </a>
              )}
              {s.type === "poll" && s.options && (
                <div className="px-4 py-3 rounded-2xl" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)", minWidth: "200px" }}>
                  <p className="text-white text-sm font-bold text-center mb-2">{s.question || "კენჭისყრა"}</p>
                  {s.options.map((opt, i) => {
                    const total = (pollVotes[`${s.id}_0`] || 0) + (pollVotes[`${s.id}_1`] || 0);
                    const votes = pollVotes[`${s.id}_${i}`] || 0;
                    const pct = total > 0 ? Math.round(votes / total * 100) : 0;
                    return (
                      <button key={i} onClick={() => setPollVotes(v => ({ ...v, [`${s.id}_${i}`]: (v[`${s.id}_${i}`] || 0) + 1 }))}
                        className="w-full mb-2 relative rounded-xl overflow-hidden py-2 text-sm font-semibold text-white"
                        style={{ background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.5)" }}>
                        <div className="absolute inset-0 rounded-xl" style={{ width: `${pct}%`, background: "rgba(255,255,255,0.3)", transition: "width 0.3s" }} />
                        <span className="relative">{opt} {total > 0 ? `${pct}%` : ""}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {s.type === "question" && (
                <div className="px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.9)", minWidth: "200px" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "var(--navy)" }}>💬 {s.question || "კითხვა"}</p>
                  {questionSent ? (
                    <p className="text-xs text-center" style={{ color: "var(--gray-mid)" }}>გაგზავნილია ✓</p>
                  ) : (
                    <div className="flex gap-1">
                      <input value={questionReply} onChange={e => setQuestionReply(e.target.value)}
                        placeholder="პასუხი..." className="flex-1 text-xs px-2 py-1 rounded-lg outline-none"
                        style={{ background: "var(--gray-light)", color: "var(--navy)" }} />
                      <button onClick={() => { if (questionReply.trim()) { setQuestionSent(true); } }}
                        className="px-2 py-1 rounded-lg text-xs text-white font-semibold"
                        style={{ background: "var(--gold)" }}>→</button>
                    </div>
                  )}
                </div>
              )}
              {s.type === "slider" && (
                <div className="px-4 py-3 rounded-2xl text-center" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", minWidth: "180px" }}>
                  <p className="text-2xl mb-1">{s.emoji || "😍"}</p>
                  <input type="range" min={0} max={100} value={sliderVal}
                    onChange={e => setSliderVal(+e.target.value)}
                    className="w-full accent-yellow-400" />
                  <p className="text-white text-xs mt-1 opacity-70">{s.question || "გაასრიალე"}</p>
                </div>
              )}
              {s.type === "countdown" && s.endDate && (
                <CountdownSticker endDate={s.endDate} label={s.text || "Countdown"} />
              )}
              {s.type === "addyours" && (
                <div className="px-4 py-3 rounded-2xl text-center" style={{ background: "rgba(255,255,255,0.9)", minWidth: "160px" }}>
                  <p className="text-2xl mb-1">➕</p>
                  <p className="text-xs font-bold" style={{ color: "var(--navy)" }}>{s.question || "Add yours"}</p>
                  <button className="mt-2 px-3 py-1 rounded-full text-xs font-semibold text-white w-full"
                    style={{ background: "var(--gold)" }}>დამატება</button>
                </div>
              )}
            </div>
          ));
        })()}

        {/* Caption */}
        {story.caption && (
          <div className="absolute bottom-28 left-4 right-4 z-10" onClick={e => e.stopPropagation()}>
            <p className="text-white text-sm" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{story.caption}</p>
          </div>
        )}

        {/* Reply input + emoji reactions (other's stories) */}
        {!isOwn && (
          <div className="absolute bottom-8 left-4 right-4 z-10" onClick={e => e.stopPropagation()}>
            {/* Quick emoji reactions */}
            <div className="flex justify-center gap-3 mb-3">
              {["❤️","😂","😮","😢","🔥","👏"].map(emoji => (
                <button key={emoji} onClick={async () => {
                  await fetch(`/api/messages/${group.id}`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: emoji }),
                  });
                  setPaused(false);
                }} className="text-2xl active:scale-125 transition-transform drop-shadow-lg">{emoji}</button>
              ))}
            </div>
            <div className="flex items-center gap-3 border border-white/40 rounded-full px-4 py-2" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
              <input type="text" placeholder={`${group.username}-ს გაუგზავნე...`} value={reply}
                onChange={e => setReply(e.target.value)}
                onFocus={() => setPaused(true)} onBlur={() => { setPaused(false); }}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/60" />
              {reply ? (
                <button onClick={handleReply}>
                  <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              ) : (
                <svg width="22" height="22" fill="none" stroke="white/60" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Viewers (own stories) */}
        {isOwn && (
          <div className="absolute bottom-8 left-4 right-4 z-10" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowViewers(true)} className="flex items-center gap-2">
              <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3" fill="none" stroke="white" strokeWidth="2"/></svg>
              <span className="text-white text-sm font-semibold">{viewCount}</span>
            </button>
          </div>
        )}
      </div>

      {/* Viewers sheet */}
      {showViewers && (
        <div className="fixed inset-0 z-[110] flex items-end" style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setShowViewers(false)}>
          <div className="w-full rounded-t-3xl" style={{ background: "var(--card)", maxHeight: "60vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <p className="font-bold" style={{ color: "var(--navy)" }}>ნახეს ({viewCount})</p>
              <button onClick={() => setShowViewers(false)} style={{ color: "var(--gray-mid)" }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            {viewers.length === 0 ? (
              <div className="py-8 text-center">
                <p style={{ color: "var(--gray-mid)" }}>ჯერ არავინ</p>
              </div>
            ) : viewers.map(v => (
              <div key={v.id} className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: "var(--navy)" }}>
                  {v.avatar ? <Image src={v.avatar} alt="" width={40} height={40} className="object-cover w-full h-full" unoptimized /> : v.username[0].toUpperCase()}
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{v.username}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
