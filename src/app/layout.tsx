import type { Metadata, Viewport } from "next";
import "./globals.css";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import PWASetup from "@/components/PWASetup";
import GlobalCallListener from "@/components/GlobalCallListener";
import { AuthProvider } from "@/lib/useAuth";
import { ThemeProvider } from "@/lib/useTheme";
import { LangProvider } from "@/lib/useLang";

export const metadata: Metadata = {
  title: "Tsagagram",
  description: "Visual Storytelling Platform",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Tsagagram" },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }, { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/logo.jpeg" />
      </head>
      <body className="h-full overflow-x-hidden" style={{ background: "var(--background)" }}>
        <ThemeProvider>
          <LangProvider>
          <AuthProvider>
            <PWASetup />
            <GlobalCallListener />
            <TopBar />
            <main className="pt-14 pb-20 min-h-full">{children}</main>
            <BottomNav />
          </AuthProvider>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
