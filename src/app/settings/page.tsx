"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
export const dynamic = "force-dynamic";

function NotificationsSection({ renderBack }: { renderBack: (label: string) => React.ReactNode }) {
  const ITEMS = [
    { key: "likes", label: "მოწონებები", desc: "როცა ვინმე მოიწონებს შენს პოსტს" },
    { key: "comments", label: "კომენტარები", desc: "ახალი კომენტარები შენს პოსტებზე" },
    { key: "followers", label: "გამომყვებები", desc: "ახალი გამომყვები" },
    { key: "messages", label: "შეტყობინებები", desc: "პირადი შეტყობინებები" },
  ];
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ likes: true, comments: true, followers: true, messages: true });
  const [pushAllowed, setPushAllowed] = useState(false);

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPushAllowed(Notification.permission === "granted");
    }
    try {
      const saved = localStorage.getItem("notif_prefs");
      if (saved) setPrefs(JSON.parse(saved));
    } catch {}
  }, []);

  const toggle = (key: string) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    localStorage.setItem("notif_prefs", JSON.stringify(next));
  };

  const requestPush = async () => {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) return;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;
    setPushAllowed(true);
    try {
      // Get VAPID public key
      const keyRes = await fetch("/api/push/subscribe");
      const { publicKey } = await keyRes.json();
      if (!publicKey) return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await fetch("/api/push/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
    } catch { /* SW not available in dev */ }
  };

  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  return (
    <div style={{ background: "var(--background)" }}>
      {renderBack("შეტყობინებები")}
      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Push permission */}
        <div className="rounded-xl px-4 py-4 flex items-center gap-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <span className="text-2xl">🔔</span>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>Push შეტყობინებები</p>
            <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{pushAllowed ? "ჩართულია" : "გამორთულია"}</p>
          </div>
          {!pushAllowed && (
            <button onClick={requestPush} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "var(--gold)" }}>
              ჩართვა
            </button>
          )}
        </div>

        <div className="rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          {ITEMS.map((item, i) => (
            <div key={item.key} className={`flex items-center justify-between px-4 py-3.5 ${i > 0 ? "border-t" : ""}`}
              style={{ borderColor: "var(--border)" }}>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--navy)" }}>{item.label}</p>
                <p className="text-xs" style={{ color: "var(--gray-mid)" }}>{item.desc}</p>
              </div>
              <button onClick={() => toggle(item.key)}
                className="w-10 h-5 rounded-full relative transition-colors"
                style={{ background: prefs[item.key] ? "var(--gold)" : "var(--border)" }}>
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{ left: prefs[item.key] ? "22px" : "2px" }} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type Section = null | "password" | "privacy" | "notifications" | "2fa" | "accounts";

function AccountsSection({ renderBack, currentUsername, refresh, router }: {
  renderBack: (label: string) => React.ReactNode;
  currentUsername: string;
  refresh: () => Promise<void>;
  router: ReturnType<typeof useRouter>;
}) {
  const [accounts, setAccounts] = useState<{ username: string; avatar?: string }[]>([]);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    fetch("/api/auth/saved-accounts").then(r => r.ok ? r.json() : []).then(setAccounts);
    // Save current account automatically
    fetch("/api/auth/saved-accounts", { method: "POST" }).catch(() => {});
  }, []);

  const switchTo = async (username: string) => {
    if (switching) return;
    setSwitching(true);
    const res = await fetch("/api/auth/saved-accounts", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    if (res.ok) { await refresh(); router.push("/"); }
    setSwitching(false);
  };

  const remove = async (username: string) => {
    await fetch("/api/auth/saved-accounts", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    setAccounts(prev => prev.filter(a => a.username !== username));
  };

  return (
    <div style={{ background: "var(--background)" }}>
      {renderBack("ანგარიშების მართვა")}
      <div className="px-4 py-4">
        <p className="text-xs mb-3 font-semibold uppercase tracking-wide" style={{ color: "var(--gray-mid)" }}>შენახული ანგარიშები</p>
        {accounts.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: "var(--gray-mid)" }}>მხოლოდ ამ ანგარიშია</p>
        ) : accounts.map(a => (
          <div key={a.username} className="flex items-center gap-3 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ background: "var(--navy)" }}>
              {a.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: "var(--navy)" }}>@{a.username}</p>
              {a.username === currentUsername && (
                <p className="text-xs" style={{ color: "var(--gold)" }}>მიმდინარე</p>
              )}
            </div>
            {a.username !== currentUsername && (
              <button onClick={() => switchTo(a.username)} disabled={switching}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                style={{ background: "var(--navy)" }}>
                {switching ? "..." : "გადასვლა"}
              </button>
            )}
            <button onClick={() => remove(a.username)} className="p-1.5" style={{ color: "#e8534a" }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        ))}
        <button onClick={() => router.push("/login?add=1")}
          className="w-full py-3 rounded-xl text-sm font-semibold mt-4"
          style={{ background: "var(--card)", color: "var(--navy)", border: "1px solid var(--border)" }}>
          + ახალი ანგარიში
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { user, logout, refresh } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<Section>(null);

  // Change password state
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  // Privacy state
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);
  const [privacySaved, setPrivacySaved] = useState(false);

  // 2FA state
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaSecret, setTwoFaSecret] = useState("");
  const [twoFaUri, setTwoFaUri] = useState("");
  const [twoFaToken, setTwoFaToken] = useState("");
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaError, setTwoFaError] = useState("");
  const [twoFaSuccess, setTwoFaSuccess] = useState("");

  useEffect(() => {
    if (section === "2fa") {
      setTwoFaLoading(true);
      fetch("/api/auth/2fa").then(r => r.json()).then(d => {
        setTwoFaEnabled(d.enabled);
        setTwoFaSecret(d.pendingSecret || "");
        setTwoFaUri(d.uri || "");
      }).finally(() => setTwoFaLoading(false));
    }
  }, [section]);

  if (!user) { router.push("/login"); return null; }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(""); setPwSuccess(false);
    if (pwForm.next !== pwForm.confirm) { setPwError("პაროლები არ ემთხვევა"); return; }
    if (pwForm.next.length < 6) { setPwError("პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს"); return; }
    setPwLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
    });
    const data = await res.json();
    if (!res.ok) { setPwError(data.error || "შეცდომა"); }
    else { setPwSuccess(true); setPwForm({ current: "", next: "", confirm: "" }); }
    setPwLoading(false);
  };

  const handlePrivacySave = async () => {
    await fetch(`/api/users/${user.username}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrivate }),
    });
    setPrivacySaved(true);
    setTimeout(() => setPrivacySaved(false), 2000);
  };

  const renderBack = (label: string) => (
    <button onClick={() => setSection(null)} className="flex items-center gap-2 px-4 py-3 border-b w-full text-left"
      style={{ borderColor: "var(--border)", color: "var(--navy)" }}>
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      <span className="font-semibold">{label}</span>
    </button>
  );

  const handle2FA = async (action: "enable" | "disable") => {
    setTwoFaError(""); setTwoFaLoading(true);
    const res = await fetch("/api/auth/2fa", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, secret: twoFaSecret, token: twoFaToken }),
    });
    const data = await res.json();
    if (!res.ok) { setTwoFaError(data.error || "შეცდომა"); }
    else {
      setTwoFaEnabled(action === "enable");
      setTwoFaToken("");
      setTwoFaSuccess(action === "enable" ? "2FA ჩართულია!" : "2FA გამორთულია");
      setTimeout(() => setTwoFaSuccess(""), 3000);
    }
    setTwoFaLoading(false);
  };

  if (section === "2fa") return (
    <div style={{ background: "var(--background)" }}>
      {renderBack("ორ-ფაქტორიანი ავთენტიფიკაცია")}
      <div className="px-4 py-4 flex flex-col gap-4">
        {twoFaLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
          </div>
        ) : twoFaEnabled ? (
          <>
            <div className="rounded-xl px-4 py-4 flex items-center gap-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>2FA ჩართულია</p>
                <p className="text-xs" style={{ color: "var(--gray-mid)" }}>Google Authenticator-ით შესვლა</p>
              </div>
            </div>
            <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>გამორთვა</p>
            <input type="text" inputMode="numeric" maxLength={6} placeholder="000000 (Authenticator კოდი)"
              value={twoFaToken} onChange={e => setTwoFaToken(e.target.value.replace(/\D/g, ""))}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none text-center tracking-widest"
              style={{ background: "var(--gray-light)", color: "var(--navy)", border: "1px solid var(--border)" }} />
            {twoFaError && <p className="text-sm" style={{ color: "#e8534a" }}>{twoFaError}</p>}
            {twoFaSuccess && <p className="text-sm" style={{ color: "#22c55e" }}>{twoFaSuccess}</p>}
            <button onClick={() => handle2FA("disable")} disabled={twoFaLoading || twoFaToken.length !== 6}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "#e8534a" }}>
              2FA გამორთვა
            </button>
          </>
        ) : (
          <>
            <div className="rounded-xl px-4 py-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--navy)" }}>1. ჩამოტვირთე Google Authenticator</p>
              <p className="text-xs" style={{ color: "var(--gray-mid)" }}>App Store ან Google Play-დან</p>
            </div>
            <div className="rounded-xl px-4 py-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <p className="text-sm font-semibold mb-2" style={{ color: "var(--navy)" }}>2. შეიყვანე გასაღები ხელით</p>
              <p className="text-xs mb-2" style={{ color: "var(--gray-mid)" }}>Google Authenticator → + → Enter setup key</p>
              <div className="p-3 rounded-lg text-center font-mono text-sm break-all select-all"
                style={{ background: "var(--gray-light)", color: "var(--navy)" }}>
                {twoFaSecret}
              </div>
              <button onClick={() => navigator.clipboard?.writeText(twoFaSecret)}
                className="text-xs mt-2 w-full text-center" style={{ color: "var(--gold)" }}>
                კოპირება
              </button>
            </div>
            <div className="rounded-xl px-4 py-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <p className="text-sm font-semibold mb-2" style={{ color: "var(--navy)" }}>3. შეიყვანე კოდი</p>
              <input type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                value={twoFaToken} onChange={e => setTwoFaToken(e.target.value.replace(/\D/g, ""))}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none text-center text-xl tracking-widest"
                style={{ background: "var(--gray-light)", color: "var(--navy)", border: "1px solid var(--border)" }} />
            </div>
            {twoFaError && <p className="text-sm" style={{ color: "#e8534a" }}>{twoFaError}</p>}
            {twoFaSuccess && <p className="text-sm" style={{ color: "#22c55e" }}>{twoFaSuccess}</p>}
            <button onClick={() => handle2FA("enable")} disabled={twoFaLoading || twoFaToken.length !== 6}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
              {twoFaLoading ? "..." : "2FA ჩართვა"}
            </button>
          </>
        )}
      </div>
    </div>
  );

  if (section === "password") return (
    <div style={{ background: "var(--background)" }}>
      {renderBack("პაროლის შეცვლა")}
      <form onSubmit={handleChangePassword} className="px-4 py-4 flex flex-col gap-3">
        {[
          { key: "current", label: "მიმდინარე პაროლი" },
          { key: "next", label: "ახალი პაროლი" },
          { key: "confirm", label: "გაიმეორე ახალი პაროლი" },
        ].map((f: { key: string; label: string }) => (
          <div key={f.key}>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--gray-mid)" }}>{f.label}</label>
            <input type="password" value={pwForm[f.key as keyof typeof pwForm]}
              onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--card)", color: "var(--navy)", border: "1px solid var(--border)" }} />
          </div>
        ))}
        {pwError && <p className="text-sm font-medium" style={{ color: "#e8534a" }}>{pwError}</p>}
        {pwSuccess && <p className="text-sm font-medium" style={{ color: "#22c55e" }}>პაროლი წარმატებით შეიცვალა!</p>}
        <button type="submit" disabled={pwLoading}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white mt-2 disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
          {pwLoading ? "..." : "შენახვა"}
        </button>
      </form>
    </div>
  );

  if (section === "privacy") return (
    <div style={{ background: "var(--background)" }}>
      {renderBack("კონფიდენციალობა")}
      <div className="px-4 py-4">
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>პირადი ანგარიში</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--gray-mid)" }}>მხოლოდ გამომყვებები ნახავენ პოსტებს</p>
            </div>
            <button onClick={() => setIsPrivate(p => !p)}
              className="w-12 h-6 rounded-full transition-all relative"
              style={{ background: isPrivate ? "var(--gold)" : "var(--border)" }}>
              <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: isPrivate ? "26px" : "2px" }} />
            </button>
          </div>
        </div>
        <button onClick={handlePrivacySave}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white mt-4"
          style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}>
          {privacySaved ? "შენახულია ✓" : "შენახვა"}
        </button>
      </div>
    </div>
  );

  if (section === "notifications") return (
    <NotificationsSection renderBack={renderBack} />
  );

  if (section === "accounts") return (
    <AccountsSection renderBack={renderBack} currentUsername={user.username} refresh={refresh} router={router} />
  );

  // Main settings
  const sections = [
    {
      title: "ანგარიში",
      items: [
        { icon: "🔒", label: "პაროლის შეცვლა", action: () => setSection("password") },
        { icon: "🔐", label: "ორ-ფაქტორიანი ავთენტიფიკაცია", action: () => setSection("2fa") },
        { icon: "👁️", label: "კონფიდენციალობა", action: () => setSection("privacy") },
        { icon: "🔔", label: "შეტყობინებები", action: () => setSection("notifications") },
        { icon: "👥", label: "ანგარიშების გადართვა", action: () => setSection("accounts") },
        { icon: "📱", label: "აქტიური სესიები", href: "/sessions" },
      ],
    },
    {
      title: "კონტენტი",
      items: [
        { icon: "📥", label: "შენახული პოსტები", href: "/saved" },
        { icon: "🗃️", label: "არქივი", href: "/archive" },
        { icon: "🟢", label: "Close Friends", href: "/close-friends" },
        { icon: "🏷️", label: "Trending ჰეშთეგები", href: "/explore" },
        { icon: "📷", label: "AR კამერა", href: "/camera" },
      ],
    },
    {
      title: "სხვა",
      items: [
        { icon: "🗺️", label: "ფოტოების რუქა", href: "/map" },
        { icon: "📊", label: "ანალიტიკა", href: "/analytics" },
        { icon: "📡", label: "Broadcast Channels", href: "/broadcast" },
      ],
    },
  ];

  return (
    <div style={{ background: "var(--background)" }}>
      {/* User info */}
      <div className="flex items-center gap-3 px-4 py-4 mb-2" style={{ background: "var(--card)" }}>
        <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xl"
          style={{ background: "var(--navy)" }}>
          {user.username[0].toUpperCase()}
        </div>
        <div>
          <p className="font-semibold" style={{ color: "var(--navy)" }}>{user.username}</p>
          <p className="text-xs" style={{ color: "var(--gray-mid)" }}>Tsagagram ანგარიში</p>
        </div>
      </div>

      {sections.map(s => (
        <div key={s.title} className="mb-4">
          <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--gray-mid)" }}>
            {s.title}
          </p>
          <div className="rounded-xl overflow-hidden mx-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            {s.items.map((item, i) => {
              const inner = (
                <>
                  <span className="text-xl w-8 text-center">{item.icon}</span>
                  <span className="text-sm font-medium flex-1" style={{ color: "var(--navy)" }}>{item.label}</span>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--gray-mid)" }}><path d="M9 18l6-6-6-6"/></svg>
                </>
              );
              return "href" in item ? (
                <Link key={item.label} href={item.href!}
                  className={`flex items-center gap-3 px-4 py-3.5 active:opacity-70 ${i > 0 ? "border-t" : ""}`}
                  style={{ borderColor: "var(--border)" }}>
                  {inner}
                </Link>
              ) : (
                <button key={item.label} onClick={(item as { action: () => void }).action}
                  className={`flex items-center gap-3 px-4 py-3.5 active:opacity-70 w-full text-left ${i > 0 ? "border-t" : ""}`}
                  style={{ borderColor: "var(--border)" }}>
                  {inner}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mx-3 mb-4">
        <button onClick={logout} className="w-full py-3.5 rounded-xl text-sm font-semibold" style={{ background: "var(--card)", color: "#e8534a", border: "1px solid var(--border)" }}>
          გასვლა
        </button>
      </div>

      <div className="px-4 pb-8 text-center">
        <p className="text-xs" style={{ color: "var(--gray-mid)" }}>Tsagagram · v2.0 · 2026</p>
      </div>
    </div>
  );
}
