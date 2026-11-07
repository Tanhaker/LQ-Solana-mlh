import type { Metadata } from "next";
import { Anton, Figtree } from "next/font/google";
import Providers from "@/components/Providers";
import Nav, { Ticker } from "@/components/Nav";
import { LINKS } from "@/lib/links";
import PageFrame from "@/components/PageFrame";
import LiquidityAI from "@/components/LiquidityAI";
import Motion from "@/components/Motion";
import HalftoneWordmarkFooter, { type FooterColumn } from "@/components/ui/halftone-wordmark-footer";
import "./globals.css";

const body = Figtree({ variable: "--ff-body", subsets: ["latin"], weight: ["500", "700", "800"] });
const display = Anton({ variable: "--ff-display", subsets: ["latin"], weight: "400" });

const FOOTER_COLUMNS: FooterColumn[] = [
  { title: "App", links: LINKS.map((l) => ({ label: l.label, href: l.href })) },
  {
    title: "Devnet",
    links: [
      { label: "Get test USDC", href: "/passes" },
      { label: "Get devnet SOL", href: "https://faucet.solana.com" },
      { label: "Solana Explorer", href: "https://explorer.solana.com/?cluster=devnet" },
    ],
  },
  {
    title: "Build",
    links: [
      { label: "Source code", href: "https://github.com/Tanhaker/LQ-Solana-mlh" },
      {
        label: "Program on-chain",
        href: "https://explorer.solana.com/address/FzUk4dbQE6PQfmMkDMcmZZ6qTPsAStY3e2Pr8aUE54Mz?cluster=devnet",
      },
    ],
  },
];

export const metadata: Metadata = {
  title: "Liquid Pass on Solana",
  description:
    "Subscriptions as time-bound passes you own. Use what you need, resell the days you don't, and the issuer earns a royalty on every resale.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* Hide reveal-on-scroll content before first paint so it animates in instead of flashing. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('motion-ready')",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <Motion />
          <Ticker />
          <Nav />
          <main className="flex-1 w-full pt-2.5 sm:pt-3">
            <PageFrame>{children}</PageFrame>
          </main>
          {/* Halftone footer: the wordmark printed in dots that part around the
              pointer and warm to our orange; click sends a ring through it. */}
          <HalftoneWordmarkFooter
            wordmark="LIQUID PASS"
            label="Liquid Pass · Built for the MLH Solana Hackathon 2026"
            meta="© 2026 · Solana devnet · test USDC only, no real money moves"
            columns={FOOTER_COLUMNS}
            palette={{ background: "#000000", ink: "#ffffff", warm: "#fb4903" }}
            fontFamily={display.style.fontFamily}
            fontWeight={400}
            monoFamily={body.style.fontFamily}
            dotGap={6}
            radius={90}
            crop={0.16}
            height="clamp(440px, 46vw, 680px)"
          />
          <LiquidityAI />
        </Providers>
      </body>
    </html>
  );
}
