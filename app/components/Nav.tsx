"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

// The wallet button reads browser-only state, so it renders on the client only.
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false, loading: () => <div className="h-8 w-32 rounded-full bg-[#0071e3]/80" /> },
);

const LINKS = [
  { href: "/market", label: "Market" },
  { href: "/passes", label: "My Passes" },
  { href: "/issuer", label: "Issuer" },
  { href: "/verify", label: "Verify" },
];

export default function Nav() {
  const path = usePathname();
  const current = LINKS.find((l) => path.startsWith(l.href));

  return (
    <>
      {/* Global nav: thin, translucent, scrolls away. */}
      <nav className="globalnav relative z-50 text-[12px]" aria-label="Global">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 h-11 flex items-center gap-6">
          <Link href="/" className="flex items-center shrink-0 opacity-90 hover:opacity-100" aria-label="Liquid Pass home">
            <Image src="/brand/logo.png" alt="" width={26} height={26} priority />
          </Link>
          <div className="flex-1 flex items-center justify-between sm:justify-center gap-5 sm:gap-10 overflow-x-auto">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`shrink-0 transition-opacity ${
                  current?.href === l.href ? "text-ink" : "text-ink/75 hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-ink/75 shrink-0">
            <span className="pulse text-[#34c759]" /> Devnet
          </span>
        </div>
      </nav>

      {/* Local nav: page title on the left, wallet on the right. Sticks. */}
      <div className="localnav sticky top-0 z-40">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 h-[52px] flex items-center gap-4">
          <Link href={current?.href ?? "/"} className="text-[21px] font-semibold tracking-[-0.02em]">
            {current?.label ?? "Liquid Pass"}
          </Link>
          <div className="ml-auto flex items-center gap-5">
            {!current && (
              <Link href="/market" className="hidden md:inline text-[12px] text-ink/75 hover:text-ink">
                Browse passes
              </Link>
            )}
            <div className="nav-wallet">
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
