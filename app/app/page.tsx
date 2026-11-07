"use client";

import Link from "next/link";
import { useState } from "react";
import { useChain } from "@/components/ChainData";

export default function Home() {
  const { plans, passes, listings, now } = useChain();
  const activePasses = passes.filter((p) => p.expiry.toNumber() > now).length;

  return (
    <>
      <section className="pt-14 sm:pt-20 grid gap-10 lg:grid-cols-[1.15fr_1fr] items-center">
        <div>
          <span className="chip chip-accent">Solana devnet · test USDC</span>
          <h1 className="text-4xl sm:text-6xl font-bold leading-[1.02] mt-5">
            Paid for 30 days, needed 10? <span className="text-accent">Sell the other 20.</span>
          </h1>
          <p className="text-lg text-ink-2 mt-6 max-w-xl leading-relaxed">
            Liquid Pass turns a subscription into a pass you own. Use what you need, then resell the
            remaining time. The price falls as the clock runs, and the issuer earns a royalty on every
            resale, in the same transaction.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link href="/market" className="btn btn-primary">
              Browse the market
            </Link>
            <Link href="/issuer" className="btn btn-ghost">
              Create a plan
            </Link>
          </div>
          <dl className="grid grid-cols-3 gap-4 mt-10 max-w-md">
            <Stat label="Plans" value={plans.length} />
            <Stat label="Active passes" value={activePasses} />
            <Stat label="On resale" value={listings.length} />
          </dl>
        </div>
        <DecayDemo />
      </section>

      <section className="mt-24">
        <div className="label">How it works</div>
        <h2 className="text-3xl sm:text-4xl font-bold mt-2 max-w-2xl">Four steps, all on Solana.</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["Issue", "A company creates a plan: price, length and resale royalty."],
            ["Buy", "You pay in USDC and get a pass account with a fixed expiry."],
            ["Resell", "List it. The price drops every second until someone buys."],
            ["Settle", "One transaction pays you and the issuer and moves the pass."],
          ].map(([t, d], i) => (
            <li key={t} className="ticket p-5">
              <div className="num text-accent text-sm">0{i + 1}</div>
              <h3 className="text-xl font-bold mt-2">{t}</h3>
              <p className="text-sm text-ink-2 mt-2 leading-relaxed">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-24 grid gap-4 md:grid-cols-3">
        {[
          [
            "Why Solana",
            "Resale only works if buying 3 days of access costs almost nothing to settle. Solana confirms in about a second for a fraction of a cent.",
          ],
          [
            "Why issuers say yes",
            "They still get 100% of the first sale. Unused days that used to be shared for free now pay them a royalty, and every resale brings them a new user.",
          ],
          [
            "Why buyers win",
            "Need a tool for a week? Buy a pass someone else finished with, below the new price, with the exact time left shown on-chain.",
          ],
        ].map(([t, d]) => (
          <div key={t} className="panel p-6">
            <h3 className="text-xl font-bold">{t}</h3>
            <p className="text-ink-2 mt-3 leading-relaxed">{d}</p>
          </div>
        ))}
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="num text-3xl mt-1">{value}</dd>
    </div>
  );
}

/** Interactive example: a 30-day, 30 USDC pass resold after `day` days. */
function DecayDemo() {
  const [day, setDay] = useState(10);
  const price = 30;
  const left = 30 - day;
  const value = (price * left) / 30;
  const royalty = value * 0.1;

  return (
    <div className="ticket">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="label">Example pass</div>
            <div className="text-2xl font-bold font-display mt-1">AI Writer Pro · 30 days</div>
          </div>
          <span className={`chip ${left > 7 ? "chip-live" : "chip-warn"}`}>{left} days left</span>
        </div>
        <label className="label block mt-6" htmlFor="day">
          Resold on day {day}
        </label>
        <input
          id="day"
          type="range"
          min={1}
          max={29}
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className="w-full mt-3 accent-[var(--accent)]"
        />
        <div className="meter mt-4">
          <span style={{ width: `${(left / 30) * 100}%` }} />
        </div>
      </div>
      <div className="ticket-cut p-6 grid grid-cols-3 gap-4">
        <Cell label="Buyer pays" value={value} strong />
        <Cell label="You get back" value={value - royalty} />
        <Cell label="Issuer royalty" value={royalty} />
      </div>
      <p className="px-6 pb-5 text-xs text-muted">
        Illustrative: a listing at the pass&apos;s time value, 10% royalty, in USDC.
      </p>
    </div>
  );
}

function Cell({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`num mt-1 ${strong ? "text-2xl text-accent" : "text-xl"}`}>{value.toFixed(2)}</div>
    </div>
  );
}
