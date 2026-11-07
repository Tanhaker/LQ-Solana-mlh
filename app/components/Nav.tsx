"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";

// The wallet button reads browser-only state, so it renders on the client only.
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false, loading: () => <div className="h-[42px] w-40 rounded-full bg-card-2 border border-line" /> },
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
    <header className="sticky top-0 z-40 border-b border-line bg-paper/70 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[68px] flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <Logo />
          <span className="font-display font-semibold text-[17px] tracking-tight">
            Liquid<span className="grad-text">Pass</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 ml-6 p-1 rounded-full border border-line bg-card-2">
          {LINKS.map((l) => {
            const active = path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-4 h-9 inline-flex items-center rounded-full text-sm font-semibold transition-all ${
                  active
                    ? "bg-ink text-paper shadow-[0_0_24px_-6px_rgba(153,69,255,0.8)]"
                    : "text-ink-2 hover:text-ink hover:bg-white/5"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden lg:inline-flex chip chip-live">
            <span className="pulse" /> Devnet
          </span>
          <WalletMultiButton />
        </div>
      </div>
      <nav className="md:hidden flex gap-1 px-4 pb-3 overflow-x-auto">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3.5 h-8 inline-flex items-center rounded-full text-sm font-semibold shrink-0 ${
              path.startsWith(l.href) ? "bg-ink text-paper" : "text-ink-2 bg-card-2 border border-line"
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
  // A ticket with a perforation, filled with the Solana gradient.
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden className="transition-transform group-hover:rotate-[-8deg]">
      <defs>
        <linearGradient id="lp-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9945FF" />
          <stop offset="0.5" stopColor="#6E7BFF" />
          <stop offset="1" stopColor="#14F195" />
        </linearGradient>
      </defs>
      <rect x="2" y="7" width="28" height="18" rx="5" fill="url(#lp-g)" />
      <circle cx="21" cy="7" r="3" fill="#07060c" />
      <circle cx="21" cy="25" r="3" fill="#07060c" />
      <path d="M21 11v10" stroke="#07060c" strokeWidth="1.6" strokeDasharray="1.8 1.8" />
      <rect x="6.5" y="12.5" width="9" height="2.2" rx="1.1" fill="#07060c" opacity="0.85" />
      <rect x="6.5" y="17.3" width="6" height="2.2" rx="1.1" fill="#07060c" opacity="0.55" />
    </svg>
  );
}
