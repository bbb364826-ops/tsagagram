"use client";
import { useState } from "react";

interface Ad {
  id: number;
  brand: string;
  handle: string;
  tagline: string;
  cta: string;
  emoji: string;
  bg: string;
  accent: string;
}

const ADS: Ad[] = [
  {
    id: 1,
    brand: "მუჭა მუჭა",
    handle: "muchaMucha.ge",
    tagline: "🍜 ახალი გემოთი — ჩაამატე კალათაში და მიიღე ფასდაკლება 20%!",
    cta: "შეუკვეთე",
    emoji: "🍜",
    bg: "linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)",
    accent: "#ff6b35",
  },
  {
    id: 2,
    brand: "GeoFresh",
    handle: "geofresh.ge",
    tagline: "🌿 ყოველდღიური სიახლე — ახალი ბოსტნეული პირდაპირ ფერმიდან შენამდე",
    cta: "ნახე კატალოგი",
    emoji: "🥦",
    bg: "linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)",
    accent: "#27ae60",
  },
  {
    id: 3,
    brand: "TbilisiStyle",
    handle: "tbilisistyle.ge",
    tagline: "👗 ახალი კოლექცია უკვე მაღაზიაში! გაზაფხული 2026 — Georgian Fashion",
    cta: "იყიდე ახლა",
    emoji: "👗",
    bg: "linear-gradient(135deg, #c9a84c 0%, #1b2d5b 100%)",
    accent: "#c9a84c",
  },
  {
    id: 4,
    brand: "KaviCafe",
    handle: "kavicafe.ge",
    tagline: "☕ საუკეთესო ყავა თბილისში — Specialty Coffee, Roasted in Georgia",
    cta: "მოგვინახულე",
    emoji: "☕",
    bg: "linear-gradient(135deg, #6f4e37 0%, #3e2723 100%)",
    accent: "#6f4e37",
  },
  {
    id: 5,
    brand: "GeoTravel",
    handle: "geotravel.ge",
    tagline: "✈️ ზაფხულის ტური სომხეთი + სომხეთი — 3 ღამე, ყველაფერი ჩათვლილი",
    cta: "დაჯავშნე",
    emoji: "✈️",
    bg: "linear-gradient(135deg, #1b2d5b 0%, #7ab8e8 100%)",
    accent: "#1b2d5b",
  },
  {
    id: 6,
    brand: "მუჭა მუჭა",
    handle: "muchaMucha.ge",
    tagline: "🎉 ახალი ფილიალი გაიხსნა ვაკეში! პირველი 50 სტუმარი — სასაჩუქრე ბარათი",
    cta: "გაიგე მეტი",
    emoji: "🎉",
    bg: "linear-gradient(135deg, #e91e8c 0%, #ff6b35 100%)",
    accent: "#e91e8c",
  },
];

export default function AdCard({ index = 0 }: { index?: number }) {
  const ad = ADS[index % ADS.length];
  const [dismissed, setDissed] = useState(false);

  if (dismissed) return null;

  return (
    <article className="border-b" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ background: ad.accent }}>
            {ad.brand[0]}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{ad.brand}</p>
            <p className="text-xs" style={{ color: "var(--gray-mid)" }}>სპონსორი</p>
          </div>
        </div>
        <button onClick={() => setDissed(true)} className="p-1" style={{ color: "var(--gray-mid)" }}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Ad image */}
      <div className="w-full aspect-square flex flex-col items-center justify-center gap-4 px-6"
        style={{ background: ad.bg }}>
        <div className="text-8xl">{ad.emoji}</div>
        <p className="text-white text-center text-lg font-bold leading-snug">{ad.brand}</p>
        <p className="text-white/90 text-center text-sm">{ad.tagline}</p>
        <button className="mt-2 px-8 py-2.5 rounded-full font-semibold text-sm"
          style={{ background: "white", color: ad.accent }}>
          {ad.cta}
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--gray-light)", color: "var(--gray-mid)" }}>
          სპონსორული
        </span>
        <span className="text-xs" style={{ color: "var(--gray-mid)" }}>{ad.handle}</span>
      </div>
    </article>
  );
}
