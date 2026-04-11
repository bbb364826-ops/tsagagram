"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/lib/useTheme";

const titles: Record<string, string> = {
  "/explore": "Search",
  "/messages": "Messages",
  "/profile": "Profile",
  "/reels": "Reels",
  "/create": "New post",
  "/notifications": "Notifications",
  "/settings": "Settings",
};

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { dark, toggle } = useTheme();
  const isHome = pathname === "/";
  const isSubPage = pathname.startsWith("/u/") || pathname.startsWith("/p/");
  const title = titles[pathname];

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
            <Link href="/notifications" style={{ color: "var(--navy)" }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
            </Link>
            <Link href="/messages" style={{ color: "var(--navy)" }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </Link>
          </div>
        </>
      ) : (
        <>
          <button onClick={() => router.back()} style={{ color: "var(--navy)" }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="text-base font-semibold" style={{ color: "var(--navy)" }}>
            {isSubPage ? (pathname.startsWith("/u/") ? pathname.split("/u/")[1] : "პოსტი") : title}
          </span>
          <div className="w-6" />
        </>
      )}
    </header>
  );
}
