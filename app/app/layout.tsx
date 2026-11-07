import type { Metadata } from "next";
import Link from "next/link";
import { Anton, Figtree } from "next/font/google";
import Providers from "@/components/Providers";
import Nav, { Ticker } from "@/components/Nav";
import { LINKS } from "@/lib/links";
import PageFrame from "@/components/PageFrame";
import LiquidityAI from "@/components/LiquidityAI";
import "./globals.css";

const body = Figtree({ variable: "--ff-body", subsets: ["latin"], weight: ["500", "700", "800"] });
const display = Anton({ variable: "--ff-display", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Liquid Pass on Solana",
  description:
    "Subscriptions as time-bound passes you own. Use what you need, resell the days you don't, and the issuer earns a royalty on every resale.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <Providers>
          <Ticker />
          <Nav />
          <main className="flex-1 w-full pt-2.5 sm:pt-3">
            <PageFrame>{children}</PageFrame>
          </main>
          <footer className="text-white px-5 sm:px-10 pt-10 pb-12">
            <div className="max-w-[1400px] mx-auto">
              <div className="display text-[22vw] sm:text-[17vw] leading-[0.8] tracking-[-0.01em] select-none" aria-hidden>
                Liquid <span className="slant text-[var(--yellow)]">Pass</span>
              </div>
              <div className="mt-10 flex flex-col lg:flex-row lg:items-end gap-8">
                <div className="space-y-2 text-[14px] text-white/60 max-w-xl leading-[1.5]">
                  <p>Liquid Pass runs on Solana devnet with test USDC from the built-in faucet. No real money moves.</p>
                  <p>
                    Resale prices fall linearly from the seller&apos;s opening price to zero at the pass&apos;s
                    expiry. Royalties are set by each issuer and paid in the same transaction.
                  </p>
                  <p className="text-white/40">© 2026 Liquid Pass. Built for the MLH Solana Hackathon 2026.</p>
                </div>
                <nav className="lg:ml-auto flex flex-wrap gap-2" aria-label="Footer">
                  {[...LINKS, { href: "https://github.com/Tanhaker/LQ-Solana-mlh", label: "Source code" }].map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="h-11 px-5 inline-flex items-center rounded-full border-[3px] border-white text-[13px] font-bold uppercase tracking-[0.02em] hover:bg-white hover:text-black transition-colors"
                    >
                      {l.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </footer>
          <LiquidityAI />
        </Providers>
      </body>
    </html>
  );
}
