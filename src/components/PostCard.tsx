"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

interface Post {
  id: string;
  images: string[];
  caption?: string;
  location?: string;
  createdAt: string;
  isLiked: boolean;
  isSaved: boolean;
  pinned?: boolean;
  archived?: boolean;
  hideLikes?: boolean;
  disableComments?: boolean;
  user: { id: string; username: string; avatar?: string; verified?: boolean };
  _count: { likes: number; comments: number };
}

interface Liker { id: string; username: string; avatar?: string; name?: string }

function formatCaption(text: string) {
  return text.split(/(#[\w\u10D0-\u10FF]+|@[\w\u10D0-\u10FF]+)/g).map((p, i) =>
    p.startsWith("#")
      ? <Link key={i} href={`/hashtag/${p.slice(1)}`} style={{ color: "var(--gold)" }} className="font-medium">{p}</Link>
      : p.startsWith("@")
      ? <Link key={i} href={`/u/${p.slice(1)}`} style={{ color: "var(--gold)" }} className="font-medium">{p}</Link>
      : <span key={i}>{p}</span>
  );
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const s = Math.floor(diff / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24), w = Math.floor(d / 7);
  if (w > 0) return `${w}w`; if (d > 0) return `${d}d`; if (h > 0) return `${h}h`; if (m > 0) return `${m}m`; return "just now";
}

export default function PostCard({ post, currentUserId, onUpdate }: {
  post: Post; currentUserId: string; onUpdate: () => void;
}) {
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post._count.likes);
  const [saved, setSaved] = useState(post.isSaved);
  const [imgIdx, setImgIdx] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption || "");
  const [showLikes, setShowLikes] = useState(false);
  const [likers, setLikers] = useState<Liker[]>([]);
  const [loadingLikers, setLoadingLikers] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [showShareDM, setShowShareDM] = useState(false);
  const [following, setFollowing] = useState<Liker[]>([]);
  const [shareSearch, setShareSearch] = useState("");
  const [shareSelected, setShareSelected] = useState<Set<string>>(new Set());
  const [shareSent, setShareSent] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const lastTap = useRef(0);
  const touchStartX = useRef(0);
  const CAPTION_LIMIT = 120;

  const doLike = async () => {
    const prev = liked;
    setLiked(!prev); setLikeCount(c => prev ? c - 1 : c + 1);
    const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    if (!res.ok) { setLiked(prev); setLikeCount(c => prev ? c + 1 : c - 1); }
  };

  const doSave = async () => {
    setSaved(!saved);
    await fetch(`/api/posts/${post.id}/save`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 350) {
      if (!liked) doLike();
      setHeartAnim(true); setTimeout(() => setHeartAnim(false), 900);
    }
    lastTap.current = now;
  };

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) < 50) return;
    if (dx > 0 && imgIdx < post.images.length - 1) setImgIdx(i => i + 1);
    if (dx < 0 && imgIdx > 0) setImgIdx(i => i - 1);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/p/${post.id}`;
    if (navigator.share) { await navigator.share({ url, title: "Check this post on Tsagagram" }); }
    else { await navigator.clipboard.writeText(url); }
    setShowMenu(false);
  };

  const handlePin = async () => {
    await fetch(`/api/posts/${post.id}/pin`, { method: "POST" });
    setShowMenu(false); onUpdate();
  };

  const handleArchive = async () => {
    await fetch(`/api/posts/${post.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !post.archived }),
    });
    setShowMenu(false); onUpdate();
  };

  const handleDelete = async () => {
    if (!confirm("პოსტი წაიშლება?")) return;
    await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    setShowMenu(false); onUpdate();
  };

  const handleEdit = async () => {
    await fetch(`/api/posts/${post.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: editCaption }),
    });
    setEditing(false); onUpdate();
  };

  const handleShareToStory = async () => {
    const imageUrl = post.images[0];
    if (!imageUrl) return;
    await fetch("/api/stories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media: imageUrl, mediaType: "image" }),
    });
    setShowMenu(false);
  };

  const handleReport = async () => {
    await fetch("/api/report", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "post", targetId: post.id, reason: "other" }),
    });
    setShowMenu(false);
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || post.disableComments) return;
    setSubmitting(true);
    await fetch(`/api/posts/${post.id}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: comment }),
    });
    setComment(""); setSubmitting(false); onUpdate();
  };

  const openShareDM = async () => {
    setShowShareDM(true); setShareSent(false); setShareSelected(new Set()); setShareSearch("");
    const res = await fetch("/api/users/suggested");
    if (res.ok) setFollowing(await res.json());
  };

  const sendToDM = async () => {
    if (!shareSelected.size) return;
    await fetch(`/api/posts/${post.id}/share`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientIds: [...shareSelected] }),
    });
    setShareSent(true);
    setTimeout(() => setShowShareDM(false), 1200);
  };

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !replyTo) return;
    await fetch(`/api/posts/${post.id}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: replyText, parentId: replyTo }),
    });
    setReplyText(""); setReplyTo(null); onUpdate();
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useEffect(() => {}, [replyTo]);

  const openLikes = async () => {
    if (post.hideLikes && post.user.id !== currentUserId) return;
    setShowLikes(true);
    setLikers([]);
    setLoadingLikers(true);
    const res = await fetch(`/api/posts/${post.id}/likes`);
    if (res.ok) setLikers(await res.json());
    setLoadingLikers(false);
  };

  const isVideo = (url: string) =>
    url.match(/\.(mp4|webm|mov)$/i) ||
    (url.includes("cloudinary.com") && url.includes("/video/"));

  return (
    <article className="border-b relative" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <Link href={`/u/${post.user.username}`} className="flex items-center gap-2.5">
          <div className="story-ring">
            <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-sm m-0.5" style={{ background: "var(--navy)" }}>
              {post.user.avatar ? <Image src={post.user.avatar} alt="" width={32} height={32} className="object-cover w-full h-full" /> : post.user.username[0].toUpperCase()}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{post.user.username}</span>
              {post.user.verified && <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--gold)"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
              {post.pinned && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "var(--gold)", color: "white" }}>📌</span>}
            </div>
            {post.location && <p className="text-xs leading-none" style={{ color: "var(--gray-mid)" }}>{post.location}</p>}
          </div>
        </Link>
        <button className="p-2" onClick={() => setShowMenu(!showMenu)} style={{ color: "var(--navy)" }}>
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
        </button>
      </div>

      {/* Dropdown */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-3 z-50 rounded-2xl shadow-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)", minWidth: "200px" }}>
            <button onClick={handleShare} className="w-full px-4 py-3.5 text-sm text-left flex items-center gap-3" style={{ color: "var(--navy)" }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              გაზიარება
            </button>
            <button onClick={handleShareToStory} className="w-full px-4 py-3.5 text-sm text-left flex items-center gap-3 border-t" style={{ color: "var(--navy)", borderColor: "var(--border)" }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
              სთორიში გაზიარება
            </button>
            {currentUserId === post.user.id ? (
              <>
                <button onClick={handlePin} className="w-full px-4 py-3.5 text-sm text-left flex items-center gap-3 border-t" style={{ color: "var(--navy)", borderColor: "var(--border)" }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  {post.pinned ? "Unpin" : "Pin to profile"}
                </button>
                <button onClick={handleArchive} className="w-full px-4 py-3.5 text-sm text-left flex items-center gap-3 border-t" style={{ color: "var(--navy)", borderColor: "var(--border)" }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                  {post.archived ? "Unarchive" : "Archive"}
                </button>
                <button onClick={() => { setEditing(true); setShowMenu(false); }} className="w-full px-4 py-3.5 text-sm text-left flex items-center gap-3 border-t" style={{ color: "var(--navy)", borderColor: "var(--border)" }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>
                <button onClick={handleDelete} className="w-full px-4 py-3.5 text-sm text-left flex items-center gap-3 border-t" style={{ color: "#e8534a", borderColor: "var(--border)" }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  Delete
                </button>
              </>
            ) : (
              <button onClick={handleReport} className="w-full px-4 py-3.5 text-sm text-left flex items-center gap-3 border-t" style={{ color: "#e8534a", borderColor: "var(--border)" }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Report
              </button>
            )}
          </div>
        </>
      )}

      {/* Media */}
      <div className="relative w-full aspect-square bg-black"
        onClick={handleDoubleTap} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {isVideo(post.images[imgIdx]) ? (
          <video src={post.images[imgIdx]} className="w-full h-full object-cover" autoPlay muted loop playsInline />
        ) : (
          <Image src={post.images[imgIdx]} alt={post.caption || "post"} fill className="object-cover" sizes="100vw" loading={imgIdx === 0 ? "eager" : "lazy"} unoptimized />
        )}

        {heartAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-7xl drop-shadow-lg" style={{ animation: "heartPop 0.8s ease-out forwards" }}>❤️</div>
          </div>
        )}

        {post.images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {post.images.map((_, i) => (
              <div key={i} className="rounded-full transition-all" style={{ width: i === imgIdx ? "6px" : "5px", height: i === imgIdx ? "6px" : "5px", background: i === imgIdx ? "white" : "rgba(255,255,255,0.5)" }} />
            ))}
          </div>
        )}

        {post.images.length > 1 && imgIdx > 0 && (
          <button onClick={e => { e.stopPropagation(); setImgIdx(i => i - 1); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.8)" }}>
            <svg width="16" height="16" fill="none" stroke="#1b2d5b" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        )}
        {post.images.length > 1 && imgIdx < post.images.length - 1 && (
          <button onClick={e => { e.stopPropagation(); setImgIdx(i => i + 1); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.8)" }}>
            <svg width="16" height="16" fill="none" stroke="#1b2d5b" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <div className="flex items-center gap-4">
          <button onClick={doLike} className="transition-transform active:scale-75">
            {liked ? (
              <svg width="26" height="26" fill="#e8534a" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            ) : (
              <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--navy)" }}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            )}
          </button>
          {!post.disableComments && (
            <Link href={`/p/${post.id}`} style={{ color: "var(--navy)" }}>
              <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            </Link>
          )}
          <button onClick={openShareDM} style={{ color: "var(--navy)" }}>
            <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <button onClick={doSave} style={{ color: "var(--navy)" }}>
          <svg width="26" height="26" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
        </button>
      </div>

      {!post.hideLikes || post.user.id === currentUserId ? (
        <button onClick={openLikes} className="text-sm font-semibold px-3 mb-1 text-left" style={{ color: "var(--navy)" }}>
          {likeCount.toLocaleString()} likes
        </button>
      ) : (
        <p className="text-sm px-3 mb-1" style={{ color: "var(--gray-mid)" }}>Likes hidden</p>
      )}

      {editing ? (
        <div className="px-3 mb-2">
          <textarea value={editCaption} onChange={e => setEditCaption(e.target.value)} rows={3}
            className="w-full text-sm outline-none resize-none rounded-lg px-3 py-2"
            style={{ background: "var(--gray-light)", color: "var(--navy)" }} />
          <div className="flex gap-2 mt-1.5">
            <button onClick={() => setEditing(false)} className="flex-1 py-1.5 rounded-lg text-sm font-semibold" style={{ background: "var(--gray-light)", color: "var(--navy)" }}>გაუქმება</button>
            <button onClick={handleEdit} className="flex-1 py-1.5 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>შენახვა</button>
          </div>
        </div>
      ) : post.caption ? (
        <p className="text-sm px-3 mb-1 leading-relaxed" style={{ color: "var(--navy)" }}>
          <Link href={`/u/${post.user.username}`} className="font-semibold mr-1">{post.user.username}</Link>
          {post.caption.length > CAPTION_LIMIT && !captionExpanded
            ? <>{formatCaption(post.caption.slice(0, CAPTION_LIMIT))}<button onClick={() => setCaptionExpanded(true)} className="ml-1 font-semibold" style={{ color: "var(--gray-mid)" }}>...მეტი</button></>
            : formatCaption(post.caption)}
        </p>
      ) : null}

      {post._count.comments > 0 && (
        <Link href={`/p/${post.id}`} className="block text-sm px-3 mb-1" style={{ color: "var(--gray-mid)" }}>
          View all {post._count.comments} comments
        </Link>
      )}

      <p className="text-[11px] px-3 pb-2 uppercase tracking-wider font-medium" style={{ color: "var(--gray-mid)" }}>{timeAgo(post.createdAt)}</p>

      {!post.disableComments && (
        <form onSubmit={handleComment} className="flex items-center gap-2 px-3 py-2.5 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: "var(--navy)" }}>
            {currentUserId[0]?.toUpperCase() || "U"}
          </div>
          <input type="text" placeholder="Add a comment…" value={comment} onChange={e => setComment(e.target.value)}
            className="flex-1 text-sm outline-none bg-transparent" style={{ color: "var(--navy)" }} />
          {comment && (
            <button type="submit" disabled={submitting} className="text-sm font-semibold" style={{ color: "var(--gold)" }}>
              {submitting ? "…" : "Post"}
            </button>
          )}
        </form>
      )}

      {/* Share to DM modal */}
      {showShareDM && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setShowShareDM(false)}>
          <div className="w-full rounded-t-3xl" style={{ background: "var(--card)", maxHeight: "80vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b" style={{ borderColor: "var(--border)" }}>
              <p className="font-bold" style={{ color: "var(--navy)" }}>გაგზავნა</p>
              <button onClick={() => setShowShareDM(false)} style={{ color: "var(--gray-mid)" }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-4 py-2 border-b" style={{ borderColor: "var(--border)" }}>
              <input type="text" placeholder="ძებნა..." value={shareSearch} onChange={e => setShareSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "var(--gray-light)", color: "var(--navy)" }} />
            </div>
            <div className="overflow-y-auto flex-1 py-2">
              {following.filter((u: Liker) => u.username.toLowerCase().includes(shareSearch.toLowerCase())).map((u: Liker) => (
                <button key={u.id} onClick={() => setShareSelected(prev => { const s = new Set(prev); s.has(u.id) ? s.delete(u.id) : s.add(u.id); return s; })}
                  className="w-full flex items-center gap-3 px-4 py-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: "var(--navy)" }}>
                    {u.avatar ? <Image src={u.avatar} alt="" width={44} height={44} className="object-cover w-full h-full" unoptimized /> : u.username[0].toUpperCase()}
                  </div>
                  <span className="text-sm flex-1 text-left" style={{ color: "var(--navy)" }}>{u.username}</span>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: shareSelected.has(u.id) ? "var(--gold)" : "var(--border)", background: shareSelected.has(u.id) ? "var(--gold)" : "transparent" }}>
                    {shareSelected.has(u.id) && <svg width="12" height="12" fill="white" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>}
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 pb-6 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              {shareSent ? (
                <p className="text-center font-semibold py-3" style={{ color: "#4caf50" }}>✓ გაგზავნილია!</p>
              ) : (
                <button onClick={sendToDM} disabled={!shareSelected.size}
                  className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
                  გაგზავნა {shareSelected.size > 0 ? `(${shareSelected.size})` : ""}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Likes modal */}
      {showLikes && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowLikes(false)}>
          <div className="w-full rounded-t-3xl" style={{ background: "var(--card)", maxHeight: "70vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <p className="font-bold" style={{ color: "var(--navy)" }}>Likes</p>
              <button onClick={() => setShowLikes(false)} style={{ color: "var(--gray-mid)" }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            {loadingLikers ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} /></div>
            ) : likers.map(liker => (
              <Link key={liker.id} href={`/u/${liker.username}`} onClick={() => setShowLikes(false)}
                className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: "var(--navy)" }}>
                  {liker.avatar ? <Image src={liker.avatar} alt="" width={40} height={40} className="object-cover w-full h-full" unoptimized /> : liker.username[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{liker.username}</p>
                  {liker.name && <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{liker.name}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes heartPop { 0%{transform:scale(0);opacity:1} 50%{transform:scale(1.3);opacity:1} 100%{transform:scale(1);opacity:0} }`}</style>
    </article>
  );
}
