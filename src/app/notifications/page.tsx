"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { useRouter } from "next/navigation";

interface Notification {
  id: string; type: string; read: boolean; createdAt: string; postId?: string; commentId?: string; postImage?: string;
  sender: { username: string; avatar?: string };
}

interface GroupedNotification {
  id: string; type: string; read: boolean; createdAt: string; postId?: string; commentId?: string; postImage?: string;
  senders: { username: string; avatar?: string }[];
  count: number;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const s = Math.floor(diff / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24), w = Math.floor(d / 7);
  if (w > 0) return `${w}კ`; if (d > 0) return `${d}დ`; if (h > 0) return `${h}სთ`; if (m > 0) return `${m}წთ`; return "ახლა";
}

const typeText: Record<string, (count: number) => string> = {
  like: (n) => n > 1 ? "და სხვებმა მოიწონეს შენი პოსტი" : "მოიწონა შენი პოსტი",
  comment: (n) => n > 1 ? "და სხვებმა დაწერეს კომენტარი" : "კომენტარი დაწერა შენს პოსტზე",
  reply: (n) => n > 1 ? "და სხვებმა გიპასუხეს" : "გიპასუხა კომენტარზე",
  follow: (n) => n > 1 ? "და სხვები გამოგყვნენ" : "გამოგყვა",
  follow_request: () => "გთხოვს follow-ს",
  mention: (n) => n > 1 ? "და სხვებმა მოგიხსენიეს კომენტარში" : "მოგიხსენია კომენტარში",
  mention_caption: (n) => n > 1 ? "და სხვებმა მოგიხსენიეს პოსტში" : "მოგიხსენია პოსტის აღწერაში",
  collab_invite: () => "გიწვევს Collab პოსტში — მიღება/უარყოფა",
  collab_accept: () => "მიიღო შენი Collab მოწვევა",
};

function groupNotifications(notifs: Notification[]): GroupedNotification[] {
  const grouped: GroupedNotification[] = [];
  const seen = new Map<string, GroupedNotification>();

  for (const n of notifs) {
    // Group key: type + postId (or commentId for replies/mentions)
    const groupable = ["like", "comment", "follow", "mention"].includes(n.type);
    const key = groupable ? `${n.type}:${n.postId ?? ""}` : n.id;
    const existing = seen.get(key);
    if (existing) {
      existing.senders.push(n.sender);
      existing.count++;
      if (!n.read) existing.read = false;
    } else {
      const g: GroupedNotification = {
        id: n.id, type: n.type, read: n.read,
        createdAt: n.createdAt, postId: n.postId, commentId: n.commentId, postImage: n.postImage,
        senders: [n.sender], count: 1,
      };
      seen.set(key, g);
      grouped.push(g);
    }
  }
  return grouped;
}

function SenderAvatars({ senders }: { senders: { username: string; avatar?: string }[] }) {
  const show = senders.slice(0, 2);
  return (
    <div className="relative flex-shrink-0" style={{ width: show.length > 1 ? 52 : 44, height: 44 }}>
      {show.map((s, i) => (
        <Link key={s.username} href={`/u/${s.username}`}
          className="absolute rounded-full overflow-hidden flex items-center justify-center text-white font-bold border-2"
          style={{
            width: show.length > 1 ? 36 : 44,
            height: show.length > 1 ? 36 : 44,
            background: "var(--navy)",
            borderColor: "var(--card)",
            left: i === 0 ? 0 : 16,
            top: i === 0 ? 0 : 8,
            zIndex: show.length - i,
          }}>
          {s.avatar
            ? <Image src={s.avatar} alt="" width={44} height={44} className="object-cover w-full h-full" unoptimized />
            : s.username[0].toUpperCase()}
        </Link>
      ))}
    </div>
  );
}

export default function Notifications() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    fetch("/api/notifications")
      .then(r => r.json())
      .then(setNotifs)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const grouped = groupNotifications(notifs);

  // Group by date
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const thisWeek = new Date(today); thisWeek.setDate(thisWeek.getDate() - 7);

  const dateGroups: { label: string; items: GroupedNotification[] }[] = [];
  const todayItems = grouped.filter(n => new Date(n.createdAt) >= today);
  const weekItems = grouped.filter(n => new Date(n.createdAt) >= thisWeek && new Date(n.createdAt) < today);
  const olderItems = grouped.filter(n => new Date(n.createdAt) < thisWeek);

  if (todayItems.length) dateGroups.push({ label: "დღეს", items: todayItems });
  if (weekItems.length) dateGroups.push({ label: "ამ კვირაში", items: weekItems });
  if (olderItems.length) dateGroups.push({ label: "წინა", items: olderItems });

  if (grouped.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
          style={{ background: "var(--gray-light)" }}>
          <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: "var(--navy)" }}>
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </div>
        <p className="font-semibold text-lg mb-1" style={{ color: "var(--navy)" }}>შეტყობინებები არ არის</p>
        <p className="text-sm text-center" style={{ color: "var(--gray-mid)" }}>
          როცა ვინმე მოიწონებს, კომენტარს დატოვებს ან გამოგყვება, აქ გამოჩნდება
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--card)" }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-bold text-lg" style={{ color: "var(--navy)" }}>შეტყობინებები</h2>
      </div>

      {dateGroups.map(group => (
        <div key={group.label}>
          <p className="px-4 py-2 text-xs font-semibold" style={{ color: "var(--gray-mid)", background: "var(--background)" }}>
            {group.label}
          </p>
          {group.items.map(n => {
            const textFn = typeText[n.type] ?? (() => n.type);
            const text = textFn(n.count);
            const primarySender = n.senders[0];
            const othersCount = n.count - n.senders.length;

            return (
              <div key={n.id} className="flex items-center gap-3 px-4 py-3 border-b"
                style={{ borderColor: "var(--border)", background: n.read ? "var(--card)" : "var(--cream)" }}>
                {/* Avatars */}
                <SenderAvatars senders={n.senders} />

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug" style={{ color: "var(--navy)" }}>
                    <Link href={`/u/${primarySender.username}`} className="font-semibold">
                      {primarySender.username}
                    </Link>
                    {n.senders.length > 1 && (
                      <span className="font-semibold">
                        {", "}
                        <Link href={`/u/${n.senders[1].username}`} className="font-semibold">
                          {n.senders[1].username}
                        </Link>
                      </span>
                    )}
                    {othersCount > 0 && (
                      <span style={{ color: "var(--gray-mid)" }}> და კიდევ {othersCount}</span>
                    )}
                    {" "}{text}
                    {" "}<span style={{ color: "var(--gray-mid)" }}>{timeAgo(n.createdAt)}</span>
                  </p>
                </div>

                {/* Post thumbnail */}
                {n.postId && n.type !== "follow" && n.type !== "follow_request" && (
                  <Link href={`/p/${n.postId}`} className="flex-shrink-0">
                    <div className="w-11 h-11 rounded-lg overflow-hidden" style={{ background: "var(--gray-light)" }}>
                      {n.postImage
                        ? <Image src={n.postImage} alt="" width={44} height={44} className="object-cover w-full h-full" unoptimized />
                        : <div className="w-full h-full flex items-center justify-center text-xl">📷</div>}
                    </div>
                  </Link>
                )}

                {/* Follow button */}
                {(n.type === "follow" || n.type === "follow_request") && (
                  <Link href={n.type === "follow_request" ? "/follow-requests" : `/u/${primarySender.username}`}
                    className="flex-shrink-0 px-4 py-1.5 rounded-lg text-sm font-semibold"
                    style={{ background: n.type === "follow_request" ? "linear-gradient(135deg,var(--gold),var(--navy))" : "var(--gray-light)", color: n.type === "follow_request" ? "white" : "var(--navy)" }}>
                    {n.type === "follow_request" ? "ნახვა" : "პროფილი"}
                  </Link>
                )}

                {/* Collab invite: go to post to accept */}
                {n.type === "collab_invite" && n.postId && (
                  <Link href={`/p/${n.postId}`}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold text-white"
                    style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
                    ნახვა
                  </Link>
                )}

                {/* Unread dot */}
                {!n.read && (
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--gold)" }} />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
