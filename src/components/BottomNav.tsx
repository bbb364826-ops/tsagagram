"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/useTheme";

const navItems = [
  {
    href: "/",
    icon: (active: boolean) => (
      <svg width="26" height="26" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    href: "/explore",
    icon: (_: boolean) => (
      <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    href: "/create",
    icon: (_: boolean) => (
      <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    href: "/notifications",
    icon: (active: boolean) => (
      <svg width="26" height="26" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
    badge: true,
  },
  {
    href: "/profile",
    icon: (active: boolean) => (
      <svg width="26" height="26" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

const moreItems = [
  { href: "/saved", label: "შენახული", emoji: "🔖" },
  { href: "/search", label: "ძიება", emoji: "🔍" },
  { href: "/follow-requests", label: "Requests", emoji: "👥" },
  { href: "/live", label: "Live", emoji: "📡" },
  { href: "/groups", label: "Communities", emoji: "🏘️" },
  { href: "/map", label: "Photo Map", emoji: "📍" },
  { href: "/broadcast", label: "Channels", emoji: "📢" },
  { href: "/analytics", label: "Insights", emoji: "📊" },
  { href: "/camera", label: "AR Camera", emoji: "📸" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { dark, toggle } = useTheme();
  const [notifCount, setNotifCount] = useState(0);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    fetch("/api/notifications/count")
      .then(r => r.json())
      .then(d => setNotifCount(d.count || 0))
      .catch(() => {});
    const iv = setInterval(() => {
      fetch("/api/notifications/count").then(r => r.json()).then(d => setNotifCount(d.count || 0)).catch(() => {});
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  const AUTH_PAGES = ["/login", "/register", "/forgot-password"];
  if (AUTH_PAGES.includes(pathname)) return null;
  if (["/reels", "/camera", "/live"].some(p => pathname.startsWith(p))) return null;

  return (
    <>
      {showMore && (
        <div className="fixed inset-0 z-50" onClick={() => setShowMore(false)} style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl p-6" style={{ background: "var(--card)" }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: "var(--border)" }} />
            <div className="grid grid-cols-3 gap-4 mb-6">
              {moreItems.map(item => (
                <Link key={item.href} href={item.href} onClick={() => setShowMore(false)}
                  className="flex flex-col items-center gap-2 py-3 rounded-2xl"
                  style={{ background: "var(--gray-light)" }}>
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-xs font-semibold" style={{ color: "var(--navy)" }}>{item.label}</span>
                </Link>
              ))}
            </div>
            <div className="flex items-center justify-between px-2 py-3 rounded-2xl" style={{ background: "var(--gray-light)" }}>
              <span className="text-sm font-semibold" style={{ color: "var(--navy)" }}>Dark Mode</span>
              <button onClick={toggle} className="w-12 h-6 rounded-full relative transition-colors" style={{ background: dark ? "var(--gold)" : "var(--border)" }}>
                <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: dark ? "calc(100% - 22px)" : "2px" }} />
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 border-t"
        style={{ background: "var(--card)", borderColor: "var(--border)", paddingBottom: "env(safe-area-inset-bottom,8px)", paddingTop: "8px" }}>
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className="relative flex items-center justify-center w-12 h-10 rounded-xl transition-colors"
              style={{ color: active ? "var(--gold)" : "var(--navy)" }}
              onClick={() => item.badge && setNotifCount(0)}>
              {item.icon(active)}
              {item.badge && notifCount > 0 && (
                <span className="absolute top-0 right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-white text-[10px] font-bold px-1"
                  style={{ background: "#e8534a" }}>
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </Link>
          );
        })}
        {/* More button */}
        <button onClick={() => setShowMore(s => !s)}
          className="flex items-center justify-center w-12 h-10 rounded-xl transition-colors"
          style={{ color: showMore ? "var(--gold)" : "var(--navy)" }}>
          <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/>
          </svg>
        </button>
      </nav>
    </>
  );
}
