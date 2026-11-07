import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import Providers from "@/components/Providers";
import Nav from "@/components/Nav";
import "./globals.css";

const body = Inter({ variable: "--ff-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Liquid Pass on Solana",
  description:
    "Subscriptions as time-bound passes you own. Use what you need, resell the days you don't, and the issuer earns a royalty on every resale.",
};

const FOOTER_LINKS = [
  { href: "/market", label: "Market" },
  { href: "/passes", label: "My Passes" },
  { href: "/issuer", label: "Issuer" },
  { href: "/verify", label: "Verify" },
  { href: "https://github.com/Tanhaker/LQ-Solana-mlh", label: "Source code" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <Providers>
          <Nav />
          <main className="flex-1 w-full max-w-[1080px] mx-auto px-4 sm:px-6 pb-24">{children}</main>
          <footer className="bg-paper text-[12px] leading-[1.4] text-muted">
            <div className="max-w-[1080px] mx-auto px-4 sm:px-6 pt-5 pb-8">
              <div className="space-y-2 pb-4 border-b border-line-strong">
                <p>
                  Liquid Pass runs on Solana devnet with test USDC from the built-in faucet. No real
                  money moves.
                </p>
                <p>
                  Resale prices fall linearly from the seller&apos;s opening price to zero at the
                  pass&apos;s expiry. Royalties are set by each issuer and paid in the same
                  transaction.
                </p>
              </div>
              <div className="pt-4 flex flex-col-reverse sm:flex-row sm:items-center gap-3 sm:gap-6">
                <span>Copyright © 2026 Liquid Pass. Built for the MLH Solana Hackathon 2026.</span>
                <nav className="flex flex-wrap items-center sm:ml-auto">
                  {FOOTER_LINKS.map((l, i) => (
                    <span key={l.href} className="flex items-center">
                      {i > 0 && <span className="mx-2 text-line-strong">|</span>}
                      <Link href={l.href} className="text-ink-2 hover:underline">
                        {l.label}
                      </Link>
                    </span>
                  ))}
                </nav>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
