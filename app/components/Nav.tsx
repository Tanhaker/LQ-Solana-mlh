"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";

// The wallet button reads browser-only state, so it renders on the client only.
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false, loading: () => <div className="h-10 w-36 rounded-full bg-card-2" /> },
);

const LINKS = [
  { href: "/market", label: "Market" },
  { href: "/passes", label: "My Passes" },
  { href: "/issuer", label: "Issuer" },
  { href: "/verify", label: "Verify" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Logo />
          <span className="font-display font-bold text-lg tracking-tight">Liquid Pass</span>
          <span className="chip chip-accent hidden sm:inline-flex">Solana</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {LINKS.map((l) => {
            const active = path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 h-9 inline-flex items-center rounded-full text-sm font-medium transition-colors ${
                  active ? "bg-ink text-paper" : "text-ink-2 hover:bg-card-2"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto">
          <WalletMultiButton />
        </div>
      </div>
      <nav className="md:hidden flex gap-1 px-4 pb-2 overflow-x-auto">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 h-8 inline-flex items-center rounded-full text-sm font-medium shrink-0 ${
              path.startsWith(l.href) ? "bg-ink text-paper" : "text-ink-2 bg-card-2"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function Logo() {
  // A ticket stub with a notch: the pass itself.
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
      <rect x="2" y="6" width="24" height="16" rx="4" fill="var(--accent)" />
      <circle cx="18" cy="6" r="2.5" fill="var(--paper)" />
      <circle cx="18" cy="22" r="2.5" fill="var(--paper)" />
      <path d="M18 9.5v9" stroke="var(--paper)" strokeWidth="1.4" strokeDasharray="1.6 1.6" />
      <rect x="6" y="11" width="8" height="2" rx="1" fill="var(--accent-ink)" opacity="0.9" />
      <rect x="6" y="15" width="5" height="2" rx="1" fill="var(--accent-ink)" opacity="0.6" />
    </svg>
  );
}
