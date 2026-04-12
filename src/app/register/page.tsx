"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function Register() {
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) {
      setError("პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს");
      return;
    }
    if (!/^[a-z0-9._]+$/i.test(form.username)) {
      setError("Username-ში მხოლოდ ლათინური ასოები, ციფრები, წერტილი და _ დასაშვებია");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "შეცდომა, სცადე თავიდან");
        return;
      }
      await refresh();
      router.push("/");
    } catch {
      setError("კავშირის შეცდომა, სცადე თავიდან");
    } finally {
      setLoading(false);
    }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  if (authLoading) return null;
  if (user) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.jpeg" alt="Tsagagram" width={80} height={80} className="rounded-2xl object-contain mb-3" />
          <h1 className="text-2xl font-bold" style={{ color: "var(--navy)" }}>ექაუნთის შექმნა</h1>
          <p className="text-sm mt-1 text-center" style={{ color: "var(--gray-mid)" }}>
            დარეგისტრირდი და ნახე მეგობრების ფოტოები და ვიდეოები
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {[
            { key: "name", placeholder: "სახელი და გვარი", type: "text" },
            { key: "username", placeholder: "Username (მხოლოდ ლათინური)", type: "text" },
            { key: "email", placeholder: "Email", type: "email" },
            { key: "password", placeholder: "პაროლი (მინ. 6 სიმბოლო)", type: "password" },
          ].map(f => (
            <input
              key={f.key}
              type={f.type}
              placeholder={f.placeholder}
              value={form[f.key as keyof typeof form]}
              onChange={set(f.key)}
              autoCapitalize={f.key === "username" || f.key === "email" ? "none" : undefined}
              autoCorrect="off"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--gray-light)", color: "var(--navy)", border: "1.5px solid var(--border)" }}
              required
            />
          ))}
          {error && <p className="text-sm text-center" style={{ color: "#e8534a" }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white mt-1 transition-opacity disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,var(--gold),var(--navy))" }}
          >
            {loading ? "..." : "რეგისტრაცია"}
          </button>
          <p className="text-xs text-center" style={{ color: "var(--gray-mid)" }}>
            რეგისტრაციით ეთანხმები წესებსა და კონფიდენციალობის პოლიტიკას.
          </p>
        </form>
        <p className="text-center text-sm mt-5" style={{ color: "var(--navy)" }}>
          ექაუნთი გაქვს?{" "}
          <Link href="/login" className="font-semibold" style={{ color: "var(--gold)" }}>შესვლა</Link>
        </p>
      </div>
    </div>
  );
}
