"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "მთავარი",
    href: "/",
    icon: (active: boolean) => (
      <svg width="24" height="24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    label: "ძიება",
    href: "/search",
    icon: (_active: boolean) => (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    label: "აღმოჩენა",
    href: "/explore",
    icon: (active: boolean) => (
      <svg width="24" height="24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    ),
  },
  {
    label: "Reels",
    href: "/reels",
    icon: (active: boolean) => (
      <svg width="24" height="24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
        <path d="M7 2v20M17 2v20M2 12h20M2 7h5M17 7h5M2 17h5M17 17h5" />
      </svg>
    ),
  },
  {
    label: "შეტყობინებები",
    href: "/messages",
    icon: (active: boolean) => (
      <svg width="24" height="24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    label: "შექმნა",
    href: "/create",
    icon: (_active: boolean) => (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    label: "პროფილი",
    href: "/profile",
    icon: (active: boolean) => (
      <svg width="24" height="24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r flex flex-col py-6 px-4 z-50"
      style={{ background: "#fff", borderColor: "var(--border)" }}>
      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-3 px-3">
        <Image src="/logo.jpeg" alt="Tsagagram" width={36} height={36} className="rounded-xl object-contain" />
        <span className="text-xl font-bold" style={{ color: "var(--navy)" }}>Tsagagram</span>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 px-3 py-3 rounded-xl font-medium transition-all hover:bg-gray-100"
              style={{ color: active ? "var(--gold)" : "var(--navy)" }}
            >
              {item.icon(active)}
              <span className={active ? "font-bold" : ""}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* More */}
      <button className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-gray-100 transition-all"
        style={{ color: "var(--navy)" }}>
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
        </svg>
        <span className="font-medium">მეტი</span>
      </button>
    </aside>
  );
}
