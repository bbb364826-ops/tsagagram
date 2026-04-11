"use client";
import Image from "next/image";

const suggestions = [
  { user: "nino.photography", name: "Nino G.", color: "#c9a84c", avatar: "N", reason: "შემოგთავაზა მეგობარმა" },
  { user: "giorgi_tbilisi", name: "Giorgi K.", color: "#1b2d5b", avatar: "G", reason: "გამომყვება tamar_k" },
  { user: "mari.design", name: "Mari D.", color: "#e87a7a", avatar: "M", reason: "შემოგთავაზა instagram" },
  { user: "luka.tech", name: "Luka T.", color: "#7ab8e8", avatar: "L", reason: "შემოგთავაზა instagram" },
  { user: "ana_art", name: "Ana B.", color: "#8e7ae8", avatar: "A", reason: "შემოგთავაზა instagram" },
];

export default function RightPanel() {
  return (
    <div className="w-80 flex-shrink-0 pt-8">
      {/* Current user */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="story-ring">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold m-0.5"
              style={{ background: "var(--navy)" }}>T</div>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>tsagagram_user</p>
            <p className="text-xs" style={{ color: "var(--gray-mid)" }}>Tsagagram-ზე გამოჩენა</p>
          </div>
        </div>
        <button className="text-xs font-semibold" style={{ color: "var(--gold)" }}>გადართვა</button>
      </div>

      {/* Suggestions */}
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm font-semibold" style={{ color: "var(--gray-mid)" }}>შემოთავაზებული</p>
        <button className="text-xs font-semibold" style={{ color: "var(--navy)" }}>ყველა ნახვა</button>
      </div>

      <div className="flex flex-col gap-3">
        {suggestions.map((s) => (
          <div key={s.user} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ background: s.color }}>
                {s.avatar}
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--navy)" }}>{s.user}</p>
                <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{s.reason}</p>
              </div>
            </div>
            <button className="text-xs font-semibold" style={{ color: "var(--gold)" }}>გამოჩენა</button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 text-xs" style={{ color: "var(--gray-mid)" }}>
        <p className="mb-2">
          {["შესახებ", "დახმარება", "პრესა", "API", "კარიერა", "კონფ."].join(" · ")}
        </p>
        <p>© 2024 Tsagagram</p>
      </div>
    </div>
  );
}
