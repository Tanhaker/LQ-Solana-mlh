import type { Metadata } from "next";
import { JetBrains_Mono, Manrope, Unbounded } from "next/font/google";
import Providers from "@/components/Providers";
import Nav from "@/components/Nav";
import "./globals.css";

const display = Unbounded({ variable: "--ff-display", subsets: ["latin"], weight: ["500", "600", "700"] });
const body = Manrope({ variable: "--ff-body", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--ff-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Liquid Pass on Solana",
  description:
    "Subscriptions as time-bound passes you own. Use what you need, resell the days you don't, and the issuer earns a royalty on every resale.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <Providers>
          <Nav />
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-20">{children}</main>
          <footer className="border-t border-line bg-paper/60 backdrop-blur">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-muted">
              <span className="font-display font-semibold text-ink">
                Liquid<span className="grad-text">Pass</span>
              </span>
              <span>Running on Solana devnet with test USDC. No real money moves.</span>
              <span className="sm:ml-auto">MLH Solana Hackathon 2026</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
