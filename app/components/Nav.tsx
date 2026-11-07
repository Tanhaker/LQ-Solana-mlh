"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LINKS } from "@/lib/links";

// The wallet button reads browser-only state, so it renders on the client only.
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false, loading: () => <div className="h-[46px] w-36 rounded-full bg-black border-[3px] border-black" /> },
);


/** Ticker strip above everything. */
export function Ticker() {
  const items = [
    "Live on Solana devnet",
    "Resell the days you don't use",
    "500 test USDC free",
    "Issuers earn on every resale",
    "Settles in about a second",
  ];
  const row = (
    <span className="flex shrink-0">
      {items.map((t) => (
        <span key={t} className="px-5 text-[13px] sm:text-[15px] font-bold uppercase tracking-[0.02em] flex items-center gap-5">
          {t}
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <path d="M6 0c.6 3.2 2.2 4.8 6 6-3.8 1.2-5.4 2.8-6 6-.6-3.2-2.2-4.8-6-6 3.8-1.2 5.4-2.8 6-6Z" />
          </svg>
        </span>
      ))}
    </span>
  );
  return (
    <div className="ticker h-[34px] flex items-center" aria-label="Announcements">
      <div className="marquee">
        {row}
        {row}
      </div>
    </div>
  );
}

export default function Nav() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 60);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => setMenu(false), [path]);

  return (
    <>
      <nav
        aria-label="Main"
        className={`fixed z-50 left-4 right-4 sm:left-7 sm:right-7 flex items-center gap-2 transition-[top] duration-300 ${
          scrolled ? "top-3" : "top-[50px] sm:top-[58px]"
        }`}
      >
        <Link
          href="/"
          aria-label="Liquid Pass home"
          className="navround !w-[52px] !h-[52px] shrink-0 hover:rotate-[-12deg] transition-transform"
        >
          <Image src="/brand/logo.png" alt="" width={34} height={34} priority />
        </Link>

        <div
          className={`ml-auto hidden lg:flex items-center gap-1.5 transition-all duration-300 ${
            scrolled ? "opacity-0 -translate-y-2 pointer-events-none" : ""
          }`}
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="navpill"
              aria-current={path.startsWith(l.href) ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-label={menu ? "Close menu" : "Open menu"}
          aria-expanded={menu}
          className="navround ml-auto lg:ml-0 shrink-0 hover:bg-[var(--yellow)] transition-colors"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            className={`transition-transform duration-300 ${menu ? "rotate-45" : ""}`}
            aria-hidden
          >
            <path d="M11 2v18M2 11h18" />
          </svg>
        </button>
        <div className="nav-wallet shrink-0">
          <WalletMultiButton />
        </div>
      </nav>

      {/* Menu sheet */}
      <div
        className={`fixed z-[49] inset-x-3 sm:inset-x-auto sm:right-7 sm:w-[420px] top-[76px] transition-all duration-300 ${
          scrolled ? "" : "sm:top-[124px] top-[116px]"
        } ${menu ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"}`}
        aria-hidden={!menu}
        inert={!menu}
      >
        <div className="panel !rounded-[32px] p-3 shadow-[8px_8px_0_#000]">
          {[{ href: "/", label: "Home" }, ...LINKS].map((l, i) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`display flex items-center justify-between rounded-[22px] px-5 py-3 text-[44px] transition-colors ${
                  active ? "bg-[var(--yellow)]" : "hover:bg-[var(--lilac)]"
                }`}
              >
                <span className={i % 2 ? "slant" : ""}>{l.label}</span>
                <svg width="26" height="26" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <path d="M3 9 9 3M4 3h5v5" />
                </svg>
              </Link>
            );
          })}
          <p className="px-5 pt-3 pb-2 text-[13px] text-muted flex items-center gap-2">
            <span className="pulse text-[var(--green)]" /> Running on Solana devnet with test USDC.
          </p>
        </div>
      </div>
    </>
  );
}
