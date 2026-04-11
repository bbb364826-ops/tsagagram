"use client";
import { useState } from "react";

interface PostProps {
  username: string;
  avatar: string;
  avatarColor: string;
  location?: string;
  imageColor: string;
  imageEmoji: string;
  caption: string;
  likes: number;
  time: string;
  comments?: { user: string; text: string }[];
}

export default function Post({
  username, avatar, avatarColor, location,
  imageColor, imageEmoji, caption, likes, time, comments = []
}: PostProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(c => liked ? c - 1 : c + 1);
  };

  return (
    <article className="border-b" style={{ borderColor: "var(--border)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="story-ring cursor-pointer">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm m-0.5"
              style={{ background: avatarColor }}>
              {avatar}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight" style={{ color: "var(--navy)" }}>{username}</p>
            {location && <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{location}</p>}
          </div>
        </div>
        <button className="p-1" style={{ color: "var(--navy)" }}>
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Image */}
      <div className="w-full aspect-square flex items-center justify-center text-8xl"
        style={{ background: imageColor }}>
        {imageEmoji}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <div className="flex items-center gap-4">
          <button onClick={handleLike} className="transition-transform active:scale-75">
            {liked ? (
              <svg width="26" height="26" fill="#e8534a" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
            ) : (
              <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--navy)" }}>
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
            )}
          </button>
          <button style={{ color: "var(--navy)" }}>
            <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </button>
          <button style={{ color: "var(--navy)" }}>
            <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <button onClick={() => setSaved(!saved)} style={{ color: "var(--navy)" }}>
          <svg width="26" height="26" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
        </button>
      </div>

      {/* Likes */}
      <p className="text-sm font-semibold px-3 mb-1" style={{ color: "var(--navy)" }}>{likeCount.toLocaleString()} მოწონება</p>

      {/* Caption */}
      <p className="text-sm px-3 mb-1" style={{ color: "var(--navy)" }}>
        <span className="font-semibold mr-1">{username}</span>
        {caption}
      </p>

      {/* Comments */}
      {comments.length > 0 && (
        <button className="text-sm px-3 mb-1" style={{ color: "var(--gray-mid)" }}>
          ყველა {comments.length} კომენტარის ნახვა
        </button>
      )}

      {/* Time */}
      <p className="text-xs px-3 pb-2" style={{ color: "var(--gray-mid)" }}>{time}</p>

      {/* Add comment */}
      <div className="flex items-center gap-2 px-3 py-2 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: "var(--navy)" }}>T</div>
        <input
          type="text"
          placeholder="კომენტარის დამატება..."
          className="flex-1 text-sm outline-none bg-transparent"
          style={{ color: "var(--navy)" }}
        />
        <button className="text-sm font-semibold" style={{ color: "var(--gold)" }}>გამოქვეყნება</button>
      </div>
    </article>
  );
}
