"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/useTheme";
import { useLang } from "@/lib/useLang";


const AUTH_PAGES = ["/login", "/register", "/forgot-password"];

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { dark, toggle } = useTheme();
  const { t } = useLang();

  const titles: Record<string, string> = {
    "/explore": t("explore"),
    "/messages": t("messages"),
    "/profile": t("profile"),
    "/reels": t("reels"),
    "/create": t("newPost"),
    "/notifications": t("notifications"),
    "/settings": t("settings"),
    "/saved": t("saved"),
    "/archive": t("archive"),
    "/analytics": t("analytics"),
    "/map": t("map"),
    "/broadcast": t("broadcast"),
    "/groups": t("groups"),
    "/live": t("live"),
    "/close-friends": t("closeFriends"),
    "/follow-requests": t("followRequests"),
    "/sessions": t("activeSessions"),
    "/search": t("search"),
  };
  const [unreadDMs, setUnreadDMs] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const isHome = pathname === "/";
  const isSubPage = pathname.startsWith("/u/") || pathname.startsWith("/p/") ||
    pathname.startsWith("/hashtag/") || pathname.startsWith("/insights/") ||
    pathname.startsWith("/qr/") || pathname.startsWith("/dm-groups/") ||
    pathname.startsWith("/call/");
  const title = titles[pathname];

  useEffect(() => {
    const fetchCounts = () => {
      fetch("/api/messages")
        .then(r => r.ok ? r.json() : [])
        .then((convs: { unread: boolean }[]) => setUnreadDMs(convs.filter(c => c.unread).length))
        .catch(() => {});
      fetch("/api/notifications/count")
        .then(r => r.ok ? r.json() : { count: 0 })
        .then(d => setUnreadNotifs(d.count || 0))
        .catch(() => {});
    };
    fetchCounts();
    const iv = setInterval(fetchCounts, 30000);
    return () => clearInterval(iv);
  }, []);

  if (AUTH_PAGES.some(p => pathname === p)) return null;
  if (pathname === "/reels") return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 border-b"
      style={{ background: "var(--card)", borderColor: "var(--border)", paddingTop: "env(safe-area-inset-top,0px)" }}>
      {isHome ? (
        <>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.jpeg" alt="Tsagagram" width={28} height={28} className="rounded-lg object-contain" />
            <span className="text-lg font-bold" style={{ color: "var(--navy)" }}>Tsagagram</span>
          </Link>
          <div className="flex items-center gap-4">
            <button onClick={toggle} style={{ color: "var(--navy)" }}>
              {dark
                ? <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>}
            </button>
            <Link href="/notifications" className="relative" style={{ color: "var(--navy)" }}
              onClick={() => setUnreadNotifs(0)}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold px-0.5"
                  style={{ background: "#e8534a" }}>
                  {unreadNotifs > 9 ? "9+" : unreadNotifs}
                </span>
              )}
            </Link>
            <Link href="/messages" className="relative" style={{ color: "var(--navy)" }}
              onClick={() => setUnreadDMs(0)}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              {unreadDMs > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold px-0.5"
                  style={{ background: "#e8534a" }}>
                  {unreadDMs > 9 ? "9+" : unreadDMs}
                </span>
              )}
            </Link>
          </div>
        </>
      ) : (
        <>
          <button onClick={() => window.history.length > 1 ? router.back() : router.push("/")} style={{ color: "var(--navy)" }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="text-base font-semibold" style={{ color: "var(--navy)" }}>
            {isSubPage
              ? (pathname.startsWith("/u/") ? decodeURIComponent(pathname.split("/u/")[1].split("/")[0])
                : pathname.startsWith("/hashtag/") ? `#${decodeURIComponent(pathname.split("/hashtag/")[1])}`
                : "")
              : (title || "")}
          </span>
          <div className="w-6" />
        </>
      )}
    </header>
  );
}
