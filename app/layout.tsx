import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import "./globals.css";

import { ensureAutomaticSyncStarted } from "@/lib/data/auto-sync";

const bodyFont = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PokeSignal",
  description: "Pokémon card price analytics with dip, avoid, and momentum signals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  ensureAutomaticSyncStarted();

  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${monoFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--color-bg)] text-slate-950">
        <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(244,114,80,0.14),_transparent_26%),linear-gradient(180deg,_#fffdf7,_#fff8ea_38%,_#f6f2e7_100%)]">
          <header className="sticky top-0 z-30 border-b border-slate-900/10 bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
              <div>
                <Link href="/" className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                  PokeSignal
                </Link>
                <p className="text-sm text-slate-600">
                  Price snapshots, interpretable signals, and honest momentum scoring.
                </p>
              </div>
              <nav className="flex items-center gap-2 rounded-full border border-slate-900/10 bg-white p-1 text-sm font-medium text-slate-700 shadow-sm">
                <Link className="rounded-full px-3 py-2 hover:bg-slate-100" href="/">
                  Dashboard
                </Link>
                <Link className="rounded-full px-3 py-2 hover:bg-slate-100" href="/watchlist">
                  Watchlist
                </Link>
                <Link className="rounded-full px-3 py-2 hover:bg-slate-100" href="/admin">
                  Admin
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
