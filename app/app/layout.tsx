import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import Providers from "@/components/Providers";
import Nav from "@/components/Nav";
import "./globals.css";

const display = Bricolage_Grotesque({ variable: "--ff-display", subsets: ["latin"] });
const body = Instrument_Sans({ variable: "--ff-body", subsets: ["latin"] });
const mono = IBM_Plex_Mono({ variable: "--ff-mono", subsets: ["latin"], weight: ["400", "500"] });

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
          <footer className="border-t border-line">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <span>Liquid Pass · Solana devnet</span>
              <span>Test USDC only. No real money moves.</span>
              <span>Built for the MLH Solana Hackathon 2026</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
