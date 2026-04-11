"use client";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

interface Comment {
  id: string; text: string; createdAt: string; isLiked: boolean; parentId?: string | null;
  user: { id: string; username: string; avatar?: string; verified?: boolean };
  _count: { replies: number; likes: number };
}

interface ProductTag {
  id: string; name: string; price: number; currency: string; url?: string | null; x: number; y: number;
}

interface Post {
  id: string; images: string[]; caption?: string; location?: string; createdAt: string;
  isLiked: boolean; isSaved: boolean; hashtags?: string[]; paidPartnership?: boolean;
  hideLikes?: boolean; disableComments?: boolean;
  collabUserId?: string; collabAccepted?: boolean;
  collabUser?: { username: string; avatar?: string; verified?: boolean } | null;
  productTags?: ProductTag[];
  user: { id: string; username: string; avatar?: string; verified?: boolean };
  _count: { likes: number; comments: number };
  comments: Comment[];
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000), d = Math.floor(h / 24), w = Math.floor(d / 7);
  if (w > 0) return `${w} კვ`; if (d > 0) return `${d} დ`; if (h > 0) return `${h} სთ`;
  const m = Math.floor(diff / 60000); return m > 0 ? `${m} წთ` : "ახლახან";
}

function Avatar({ user, size = 36 }: { user: { username: string; avatar?: string }; size?: number }) {
  return (
    <div className="rounded-full overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ background: "var(--navy)", width: size, height: size, minWidth: size, fontSize: size * 0.35 }}>
      {user.avatar
        ? <Image src={user.avatar} alt="" width={size} height={size} className="object-cover w-full h-full rounded-full" unoptimized />
        : user.username[0].toUpperCase()}
    </div>
  );
}

const REPORT_REASONS = [
  { value: "spam", label: "სპამი" },
  { value: "hate", label: "სიძულვილის ენა" },
  { value: "violence", label: "ძალადობა" },
  { value: "nudity", label: "შეუფერებელი კონტენტი" },
  { value: "false_info", label: "ყალბი ინფორმაცია" },
  { value: "bullying", label: "ბულინგი" },
  { value: "other", label: "სხვა" },
];

function CommentRow({ c, onReply, currentUserId, postOwnerId, postId, pinnedId, onDelete, onPin }: {
  c: Comment; onReply: (id: string, username: string) => void;
  currentUserId?: string; postOwnerId?: string; postId: string; pinnedId?: string | null;
  onDelete: (id: string) => void; onPin?: (id: string) => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [localLiked, setLocalLiked] = useState(c.isLiked);
  const [likeCount, setLikeCount] = useState(c._count.likes);
  const [showMenu, setShowMenu] = useState(false);
  const isPinned = pinnedId === c.id;
  const isOwner = currentUserId === postOwnerId;

  const handleLike = async () => {
    const next = !localLiked;
    setLocalLiked(next);
    setLikeCount(n => n + (next ? 1 : -1));
    await fetch(`/api/posts/comments/${c.id}/like`, { method: "POST" });
  };

  const loadReplies = async () => {
    if (showReplies) { setShowReplies(false); return; }
    setLoadingReplies(true);
    const res = await fetch(`/api/posts/${postId}/comments?parentId=${c.id}`);
    if (res.ok) setReplies(await res.json());
    setLoadingReplies(false);
    setShowReplies(true);
  };

  const handleDelete = async () => {
    await fetch(`/api/posts/${postId}/comments`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId: c.id }),
    });
    onDelete(c.id);
    setShowMenu(false);
  };

  const handlePin = async () => {
    await fetch(`/api/posts/${postId}/comments/${c.id}/pin`, { method: "POST" });
    onPin?.(c.id);
    setShowMenu(false);
  };

  // Render text with @mentions highlighted
  const renderText = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((p, i) =>
      p.startsWith("@") ? <Link key={i} href={`/u/${p.slice(1)}`} className="font-semibold" style={{ color: "var(--gold)" }}>{p}</Link> : p
    );
  };

  return (
    <div>
      {isPinned && (
        <div className="flex items-center gap-1 px-3 pt-1 pb-0">
          <svg width="12" height="12" fill="none" stroke="var(--gray-mid)" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <span className="text-xs" style={{ color: "var(--gray-mid)" }}>Pinned</span>
        </div>
      )}
      <div className="flex gap-3 px-3 py-2.5">
        <Link href={`/u/${c.user.username}`}><Avatar user={c.user} size={32} /></Link>
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug" style={{ color: "var(--navy)" }}>
            <Link href={`/u/${c.user.username}`} className="font-semibold mr-1">{c.user.username}</Link>
            {renderText(c.text)}
          </p>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-xs" style={{ color: "var(--gray-mid)" }}>{timeAgo(c.createdAt)}</span>
            {likeCount > 0 && <span className="text-xs font-semibold" style={{ color: "var(--gray-mid)" }}>{likeCount} მოწ.</span>}
            <button onClick={() => onReply(c.id, c.user.username)} className="text-xs font-semibold" style={{ color: "var(--gray-mid)" }}>Reply</button>
            {(c.user.id === currentUserId || isOwner) && (
              <button onClick={() => setShowMenu(true)} className="text-xs" style={{ color: "var(--gray-mid)" }}>···</button>
            )}
          </div>
          {c._count.replies > 0 && (
            <button onClick={loadReplies} className="text-xs font-semibold mt-1.5 flex items-center gap-1" style={{ color: "var(--navy)" }}>
              <span className="w-6 h-px inline-block" style={{ background: "var(--gray-mid)" }} />
              {showReplies ? "დამალვა" : `${c._count.replies} პასუხი`}
              {loadingReplies && <span className="w-3 h-3 border border-current rounded-full animate-spin" />}
            </button>
          )}
          {showReplies && (
            <div className="mt-2">
              {replies.map(r => (
                <div key={r.id} className="flex gap-2 py-1.5">
                  <Link href={`/u/${r.user.username}`}><Avatar user={r.user} size={24} /></Link>
                  <div className="flex-1">
                    <p className="text-sm leading-snug" style={{ color: "var(--navy)" }}>
                      <Link href={`/u/${r.user.username}`} className="font-semibold mr-1">{r.user.username}</Link>
                      {renderText(r.text)}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs" style={{ color: "var(--gray-mid)" }}>{timeAgo(r.createdAt)}</span>
                      <button onClick={() => onReply(c.id, r.user.username)} className="text-xs font-semibold" style={{ color: "var(--gray-mid)" }}>Reply</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={handleLike} className="flex flex-col items-center gap-0.5 pt-1 self-start">
          <svg width="14" height="14" fill={localLiked ? "#e8534a" : "none"} stroke={localLiked ? "#e8534a" : "var(--gray-mid)"} strokeWidth="2" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>
      </div>
      {showMenu && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowMenu(false)}>
          <div className="w-full rounded-t-2xl p-4" style={{ background: "var(--card)" }} onClick={e => e.stopPropagation()}>
            {isOwner && (
              <button onClick={handlePin} className="w-full py-3 text-sm font-semibold" style={{ color: "var(--navy)" }}>
                {isPinned ? "📌 Pinned-ის გაუქმება" : "📌 Pin კომენტარი"}
              </button>
            )}
            {(c.user.id === currentUserId || isOwner) && (
              <button onClick={handleDelete} className="w-full py-3 text-sm font-semibold text-red-500">კომენტარის წაშლა</button>
            )}
            <button onClick={() => setShowMenu(false)} className="w-full py-3 text-sm font-semibold mt-1" style={{ color: "var(--navy)" }}>გაუქმება</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [comment, setComment] = useState("");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [editCaption, setEditCaption] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editHideLikes, setEditHideLikes] = useState(false);
  const [editDisableComments, setEditDisableComments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDone, setReportDone] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [pinnedCommentId, setPinnedCommentId] = useState<string | null>(null);
  const [showProductTags, setShowProductTags] = useState(false);
  const [activeProductTag, setActiveProductTag] = useState<ProductTag | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const lastTap = useRef(0);

  // @mention autocomplete
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState<{ id: string; username: string; avatar?: string }[]>([]);
  const [showMentions, setShowMentions] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/posts/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setPost(data);
    setLiked(data.isLiked);
    setLikeCount(data._count.likes);
    setSaved(data.isSaved);
    setEditCaption(data.caption || "");
    setEditLocation(data.location || "");
    setEditHideLikes(data.hideLikes || false);
    setEditDisableComments(data.disableComments || false);
    if (data.pinnedCommentId) setPinnedCommentId(data.pinnedCommentId);
  };

  useEffect(() => { load(); }, [id]);

  const handleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount(c => next ? c + 1 : c - 1);
    await fetch(`/api/posts/${id}/like`, { method: "POST" });
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) { setLiked(true); setLikeCount(c => c + 1); fetch(`/api/posts/${id}/like`, { method: "POST" }); }
      setHeartAnim(true); setTimeout(() => setHeartAnim(false), 800);
    }
    lastTap.current = now;
  };

  const handleSave = async () => {
    setSaved(s => !s);
    await fetch(`/api/posts/${id}/save`, { method: "POST" });
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || submitting) return;
    setSubmitting(true);
    await fetch(`/api/posts/${id}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: comment, parentId: replyTo?.id || null }),
    });
    setComment(""); setReplyTo(null); setSubmitting(false);
    setShowMentions(false);
    load();
  };

  const handleCommentChange = async (val: string) => {
    setComment(val);
    const atMatch = val.match(/@(\w+)$/);
    if (atMatch && atMatch[1].length >= 1) {
      setMentionQuery(atMatch[1]);
      setShowMentions(true);
      const res = await fetch(`/api/users/search?q=${atMatch[1]}&limit=5`);
      if (res.ok) setMentionSuggestions(await res.json());
    } else {
      setShowMentions(false);
      setMentionSuggestions([]);
    }
  };

  const insertMention = (username: string) => {
    const newText = comment.replace(/@(\w+)$/, `@${username} `);
    setComment(newText);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleReply = (commentId: string, username: string) => {
    setReplyTo({ id: commentId, username });
    setComment(`@${username} `);
    inputRef.current?.focus();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    if (dy > 30) return;
    if (!post) return;
    if (dx > 50 && imgIdx < post.images.length - 1) setImgIdx(i => i + 1);
    if (dx < -50 && imgIdx > 0) setImgIdx(i => i - 1);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ url });
    } else {
      await navigator.clipboard.writeText(url);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    }
  };

  const handleShareToStory = async () => {
    if (!post) return;
    const imgUrl = post.images[0];
    await fetch("/api/stories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media: imgUrl, mediaType: "image", caption: `Post by @${post.user.username}` }),
    });
    setShowMenu(false);
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2000);
  };

  const handleEdit = async () => {
    if (!post) return;
    setSaving(true);
    const res = await fetch(`/api/posts/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: editCaption, location: editLocation, hideLikes: editHideLikes, disableComments: editDisableComments }),
    });
    if (res.ok) { const updated = await res.json(); setPost(p => p ? { ...p, ...updated } : p); }
    setSaving(false);
    setShowEdit(false);
  };

  const handleDelete = async () => {
    if (!confirm("პოსტი წაიშლება. გააგრძელო?")) return;
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    router.push("/profile");
  };

  const handleReport = async () => {
    if (!reportReason) return;
    await fetch("/api/report", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "post", targetId: id, reason: reportReason }),
    });
    setReportDone(true);
  };

  const handleCommentDelete = (commentId: string) => {
    setPost(p => p ? { ...p, comments: p.comments.filter(c => c.id !== commentId) } : p);
  };

  if (!post) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
    </div>
  );

  const images = post.images || [];
  const isOwner = user?.id === post.user.id;

  // Render caption with hashtags and @mentions
  const renderCaption = (text: string) => {
    const parts = text.split(/(#[\w\u10D0-\u10FF]+|@\w+)/g);
    return parts.map((p, i) => {
      if (p.startsWith("#")) return <Link key={i} href={`/hashtag/${p.slice(1)}`} className="font-semibold" style={{ color: "var(--gold)" }}>{p}</Link>;
      if (p.startsWith("@")) return <Link key={i} href={`/u/${p.slice(1)}`} className="font-semibold" style={{ color: "var(--gold)" }}>{p}</Link>;
      return p;
    });
  };

  return (
    <div style={{ background: "var(--card)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Link href={`/u/${post.user.username}`} className="flex items-center gap-2 min-w-0">
            <div className="story-ring flex-shrink-0">
              <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-sm m-0.5"
                style={{ background: "var(--navy)" }}>
                {post.user.avatar
                  ? <Image src={post.user.avatar} alt="" width={36} height={36} className="object-cover w-full h-full rounded-full" unoptimized />
                  : post.user.username[0].toUpperCase()}
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-sm" style={{ color: "var(--navy)" }}>{post.user.username}</span>
                {post.user.verified && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--gold)"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                )}
              </div>
              {post.location && <p className="text-xs truncate" style={{ color: "var(--gray-mid)" }}>{post.location}</p>}
            </div>
          </Link>

          {post.collabUser && (
            <>
              <span className="text-xs font-semibold" style={{ color: "var(--gray-mid)" }}>და</span>
              <Link href={`/u/${post.collabUser.username}`} className="flex items-center gap-1.5">
                <Avatar user={post.collabUser} size={28} />
                <span className="font-semibold text-xs" style={{ color: "var(--navy)" }}>{post.collabUser.username}</span>
              </Link>
            </>
          )}
        </div>

        {/* 3-dot menu */}
        <button onClick={() => setShowMenu(true)} className="p-1">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style={{ color: "var(--navy)" }}>
            <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
          </svg>
        </button>
      </div>

      {/* Image carousel with double-tap like */}
      {images.length > 0 && (
        <div className="relative w-full aspect-square overflow-hidden"
          onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
          onClick={handleDoubleTap} style={{ cursor: "pointer" }}>
          {images[imgIdx]?.match(/\.(mp4|webm|mov)$/i) ? (
            <video src={images[imgIdx]} autoPlay muted loop playsInline className="w-full h-full object-cover" />
          ) : images[imgIdx] ? (
            <Image src={images[imgIdx]} alt={post.caption || "post"} fill className="object-cover" unoptimized />
          ) : null}
          {/* Double-tap heart animation */}
          {heartAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <svg width="80" height="80" fill="white" viewBox="0 0 24 24" className="drop-shadow-lg animate-ping" style={{ animationDuration: "0.6s" }}>
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </div>
          )}
          {/* Product tag pins */}
          {(post.productTags?.length ?? 0) > 0 && showProductTags && (
            post.productTags!.map(tag => (
              <button key={tag.id}
                onClick={e => { e.stopPropagation(); setActiveProductTag(t => t?.id === tag.id ? null : tag); }}
                className="absolute"
                style={{ left: `${tag.x}%`, top: `${tag.y}%`, transform: "translate(-50%,-50%)" }}>
                <div className="w-5 h-5 rounded-full bg-white shadow-lg border-2 flex items-center justify-center"
                  style={{ borderColor: "var(--navy)" }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: "var(--navy)" }} />
                </div>
                {activeProductTag?.id === tag.id && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 min-w-[140px]"
                    onClick={e => e.stopPropagation()}>
                    <div className="rounded-xl shadow-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
                      <div className="px-3 py-2.5">
                        <p className="text-white text-sm font-semibold leading-tight">{tag.name}</p>
                        <p className="text-white/80 text-xs mt-0.5">{tag.price} {tag.currency}</p>
                        {tag.url && (
                          <a href={tag.url} target="_blank" rel="noopener noreferrer"
                            className="block mt-2 text-center py-1.5 rounded-lg text-xs font-semibold text-white"
                            style={{ background: "var(--gold)" }}
                            onClick={e => e.stopPropagation()}>
                            შეძენა →
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="w-0 h-0 mx-auto" style={{ borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid rgba(0,0,0,0.85)" }} />
                  </div>
                )}
              </button>
            ))
          )}
          {/* Shopping bag toggle when post has product tags */}
          {(post.productTags?.length ?? 0) > 0 && (
            <button onClick={e => { e.stopPropagation(); setShowProductTags(s => !s); setActiveProductTag(null); }}
              className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: showProductTags ? "var(--navy)" : "rgba(0,0,0,0.6)", color: "white" }}>
              🛍️ {post.productTags!.length}
            </button>
          )}
          {images.length > 1 && (
            <>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full transition-all"
                    style={{ background: i === imgIdx ? "white" : "rgba(255,255,255,0.5)" }} />
                ))}
              </div>
              <div className="absolute top-2 right-3 px-2 py-0.5 rounded-full text-xs text-white font-semibold"
                style={{ background: "rgba(0,0,0,0.5)" }}>{imgIdx + 1}/{images.length}</div>
              {imgIdx > 0 && (
                <button onClick={e => { e.stopPropagation(); setImgIdx(i => i - 1); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.4)" }}>
                  <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
              )}
              {imgIdx < images.length - 1 && (
                <button onClick={e => { e.stopPropagation(); setImgIdx(i => i + 1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.4)" }}>
                  <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Collab invite banner — shown to the invited collab user before they accept */}
      {post.collabUserId === user?.id && !post.collabAccepted && (
        <div className="mx-3 mt-3 rounded-xl px-4 py-3" style={{ background: "var(--cream)", border: "1px solid var(--border)" }}>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--navy)" }}>📨 Collab მოწვევა</p>
          <p className="text-xs mb-3" style={{ color: "var(--gray-mid)" }}>@{post.user.username}-მა მოგიწვიათ ამ პოსტის თანაავტორად</p>
          <div className="flex gap-2">
            <button onClick={async () => {
              const r = await fetch(`/api/posts/${post.id}/collab`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "accept" }) });
              if (r.ok) setPost(p => p ? { ...p, collabAccepted: true } : p);
            }} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--navy)" }}>
              მიღება ✓
            </button>
            <button onClick={async () => {
              const r = await fetch(`/api/posts/${post.id}/collab`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "decline" }) });
              if (r.ok) setPost(p => p ? { ...p, collabUserId: undefined, collabAccepted: false } : p);
            }} className="flex-1 py-2 rounded-lg text-sm font-semibold" style={{ background: "var(--gray-light)", color: "var(--gray-mid)" }}>
              უარყოფა
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <div className="flex items-center gap-4">
          <button onClick={handleLike} className="active:scale-75 transition-transform">
            {liked
              ? <svg width="26" height="26" fill="#e8534a" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
              : <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--navy)" }}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>}
          </button>
          <button onClick={() => { if (!post.disableComments) inputRef.current?.focus(); }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: post.disableComments ? "var(--gray-mid)" : "var(--navy)" }}>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </button>
          <button onClick={handleShare}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--navy)" }}>
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <button onClick={handleSave} className="active:scale-90 transition-transform">
          <svg width="24" height="24" fill={saved ? "var(--navy)" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--navy)" }}>
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
          </svg>
        </button>
      </div>

      <div className="px-3 pb-1 flex items-center justify-between">
        {!post.hideLikes
          ? <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{likeCount.toLocaleString()} მოწონება</p>
          : <div />}
        {isOwner && (
          <Link href={`/insights/${post.id}`}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: "var(--gray-light)", color: "var(--navy)" }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            ინსაიტები
          </Link>
        )}
      </div>

      {post.caption && (
        <p className="text-sm px-3 pb-1 leading-relaxed" style={{ color: "var(--navy)" }}>
          <Link href={`/u/${post.user.username}`} className="font-semibold mr-1">{post.user.username}</Link>
          {renderCaption(post.caption)}
        </p>
      )}

      {post.paidPartnership && (
        <p className="text-xs px-3 pb-1" style={{ color: "var(--gray-mid)" }}>Paid partnership</p>
      )}

      <p className="text-xs px-3 pb-3 uppercase tracking-wide" style={{ color: "var(--gray-mid)" }}>{timeAgo(post.createdAt)}</p>

      {/* Comments */}
      {!post.disableComments && (
        <div className="border-t" style={{ borderColor: "var(--border)" }}>
          {post.comments.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: "var(--gray-mid)" }}>კომენტარები არ არის. პირველი დაწერე!</p>
          )}
          {post.comments.map(c => (
            <div key={c.id} className="border-b" style={{ borderColor: "var(--border)" }}>
              <CommentRow c={c} onReply={handleReply} currentUserId={user?.id} postOwnerId={post?.user.id} postId={id} pinnedId={pinnedCommentId} onDelete={handleCommentDelete} onPin={id => setPinnedCommentId(id)} />
            </div>
          ))}
        </div>
      )}

      {/* Comment input */}
      {user && !post.disableComments && (
        <form onSubmit={handleComment} className="sticky bottom-16 flex flex-col border-t"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          {replyTo && (
            <div className="flex items-center justify-between px-3 py-1.5"
              style={{ background: "var(--gray-light)", borderBottom: "1px solid var(--border)" }}>
              <span className="text-xs" style={{ color: "var(--gray-mid)" }}>
                პასუხობ: <span className="font-semibold" style={{ color: "var(--navy)" }}>@{replyTo.username}</span>
              </span>
              <button type="button" onClick={() => { setReplyTo(null); setComment(""); }}
                className="text-xs font-semibold" style={{ color: "var(--gray-mid)" }}>გაუქმება</button>
            </div>
          )}
          {/* @mention suggestions */}
          {showMentions && mentionSuggestions.length > 0 && (
            <div className="border-b" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
              {mentionSuggestions.map(u => (
                <button key={u.id} type="button" onClick={() => insertMention(u.username)}
                  className="flex items-center gap-2 w-full px-4 py-2 text-left hover:opacity-70">
                  <Avatar user={u} size={28} />
                  <span className="text-sm font-semibold" style={{ color: "var(--navy)" }}>@{u.username}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-3">
            <Avatar user={user} size={32} />
            <input ref={inputRef} type="text" placeholder="კომენტარის დამატება..." value={comment}
              onChange={e => handleCommentChange(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent" style={{ color: "var(--navy)" }} />
            {comment && (
              <button type="submit" disabled={submitting} className="text-sm font-semibold" style={{ color: "var(--gold)" }}>
                {submitting ? "..." : "გამოქვ."}
              </button>
            )}
          </div>
        </form>
      )}
      {post.disableComments && (
        <div className="py-4 text-center border-t" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--gray-mid)" }}>კომენტარები გამორთულია</p>
        </div>
      )}

      {/* Share toast */}
      {shareToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-white text-sm font-semibold z-50"
          style={{ background: "rgba(0,0,0,0.8)" }}>ლინკი დაკოპირდა ✓</div>
      )}

      {/* 3-dot menu sheet */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowMenu(false)}>
          <div className="w-full rounded-t-2xl overflow-hidden" style={{ background: "var(--card)" }} onClick={e => e.stopPropagation()}>
            {isOwner ? (
              <>
                <button onClick={() => { setShowMenu(false); setShowEdit(true); }}
                  className="flex items-center gap-3 w-full px-5 py-4 border-b text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--navy)" }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  პოსტის რედაქტირება
                </button>
                <button onClick={handleShareToStory}
                  className="flex items-center gap-3 w-full px-5 py-4 border-b text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--navy)" }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                  Story-ში გაზიარება
                </button>
                <button onClick={handleShare}
                  className="flex items-center gap-3 w-full px-5 py-4 border-b text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--navy)" }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  ლინკის გაზიარება
                </button>
                <button onClick={handleDelete}
                  className="flex items-center gap-3 w-full px-5 py-4 border-b text-sm font-medium text-red-500" style={{ borderColor: "var(--border)" }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                  პოსტის წაშლა
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { setShowMenu(false); setShowReport(true); }}
                  className="flex items-center gap-3 w-full px-5 py-4 border-b text-sm font-medium text-red-500" style={{ borderColor: "var(--border)" }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                  პოსტის შეტყობინება
                </button>
                <button onClick={handleShareToStory}
                  className="flex items-center gap-3 w-full px-5 py-4 border-b text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--navy)" }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                  Story-ში გაზიარება
                </button>
                <button onClick={handleShare}
                  className="flex items-center gap-3 w-full px-5 py-4 border-b text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--navy)" }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  ლინკის კოპირება
                </button>
                <Link href={`/u/${post.user.username}`} onClick={() => setShowMenu(false)}
                  className="flex items-center gap-3 w-full px-5 py-4 border-b text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--navy)" }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  პროფილის ნახვა
                </Link>
              </>
            )}
            <button onClick={() => setShowMenu(false)}
              className="w-full py-4 text-sm font-semibold" style={{ color: "var(--navy)" }}>გაუქმება</button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full rounded-t-2xl p-5" style={{ background: "var(--card)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base" style={{ color: "var(--navy)" }}>პოსტის რედაქტირება</h3>
              <button onClick={() => setShowEdit(false)} style={{ color: "var(--gray-mid)" }}>✕</button>
            </div>
            <textarea value={editCaption} onChange={e => setEditCaption(e.target.value)}
              placeholder="Caption..." rows={4}
              className="w-full text-sm outline-none rounded-xl px-3 py-2.5 mb-3 resize-none"
              style={{ background: "var(--gray-light)", color: "var(--navy)", border: "1.5px solid var(--border)" }} />
            <input value={editLocation} onChange={e => setEditLocation(e.target.value)}
              placeholder="Location..."
              className="w-full text-sm outline-none rounded-xl px-3 py-2.5 mb-3"
              style={{ background: "var(--gray-light)", color: "var(--navy)", border: "1.5px solid var(--border)" }} />
            <div className="flex flex-col gap-2 mb-4">
              <label className="flex items-center justify-between text-sm" style={{ color: "var(--navy)" }}>
                Like count-ის დამალვა
                <button onClick={() => setEditHideLikes(v => !v)}
                  className="w-11 h-6 rounded-full transition-colors relative"
                  style={{ background: editHideLikes ? "var(--gold)" : "var(--gray-light)" }}>
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow"
                    style={{ left: editHideLikes ? "22px" : "2px" }} />
                </button>
              </label>
              <label className="flex items-center justify-between text-sm" style={{ color: "var(--navy)" }}>
                კომენტარების გამორთვა
                <button onClick={() => setEditDisableComments(v => !v)}
                  className="w-11 h-6 rounded-full transition-colors relative"
                  style={{ background: editDisableComments ? "var(--gold)" : "var(--gray-light)" }}>
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow"
                    style={{ left: editDisableComments ? "22px" : "2px" }} />
                </button>
              </label>
            </div>
            <button onClick={handleEdit} disabled={saving}
              className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
              {saving ? "..." : "შენახვა"}
            </button>
          </div>
        </div>
      )}

      {/* Report modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full rounded-t-2xl p-5" style={{ background: "var(--card)" }}>
            {reportDone ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-semibold" style={{ color: "var(--navy)" }}>შეტყობინება გაიგზავნა</p>
                <p className="text-sm mt-1 mb-4" style={{ color: "var(--gray-mid)" }}>გმადლობთ, გადავხედავთ</p>
                <button onClick={() => { setShowReport(false); setReportDone(false); setReportReason(""); }}
                  className="px-6 py-2 rounded-xl font-semibold text-white text-sm"
                  style={{ background: "var(--navy)" }}>დახურვა</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold" style={{ color: "var(--navy)" }}>პოსტის შეტყობინება</h3>
                  <button onClick={() => setShowReport(false)} style={{ color: "var(--gray-mid)" }}>✕</button>
                </div>
                <p className="text-sm mb-3" style={{ color: "var(--gray-mid)" }}>რატომ ახსენებ ამ პოსტს?</p>
                <div className="flex flex-col gap-1 mb-4">
                  {REPORT_REASONS.map(r => (
                    <button key={r.value} onClick={() => setReportReason(r.value)}
                      className="flex items-center justify-between px-4 py-3 rounded-xl text-sm text-left"
                      style={{ background: reportReason === r.value ? "var(--gray-light)" : "transparent", color: "var(--navy)", border: `1.5px solid ${reportReason === r.value ? "var(--gold)" : "var(--border)"}` }}>
                      {r.label}
                      {reportReason === r.value && <svg width="16" height="16" fill="var(--gold)" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                    </button>
                  ))}
                </div>
                <button onClick={handleReport} disabled={!reportReason}
                  className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-40"
                  style={{ background: "#e8534a" }}>გაგზავნა</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
