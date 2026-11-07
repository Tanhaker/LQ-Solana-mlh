"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useChain } from "@/components/ChainData";

export default function Home() {
  const { plans, passes, listings, now } = useChain();
  const activePasses = passes.filter((p) => p.expiry.toNumber() > now).length;

  return (
    <>
      <section className="pt-14 sm:pt-20 grid gap-14 lg:grid-cols-[1.1fr_1fr] items-center">
        <div>
          <span className="chip chip-accent">
            <span className="pulse text-[#14f195]" /> Live on Solana devnet
          </span>
          <h1 className="text-[40px] sm:text-[64px] font-bold leading-[1.02] mt-6">
            Paid for 30 days?
            <br />
            Needed 10?
            <br />
            <span className="grad-text">Sell the other 20.</span>
          </h1>
          <p className="text-lg text-ink-2 mt-7 max-w-xl leading-relaxed">
            Liquid Pass turns a subscription into a pass you own on Solana. Use what you need,
            resell the time you don&apos;t. The price falls every second, and the issuer earns a
            royalty on every resale, settled in one transaction.
          </p>
          <div className="flex flex-wrap gap-3 mt-9">
            <Link href="/market" className="btn btn-primary">
              Explore the market →
            </Link>
            <Link href="/issuer" className="btn btn-ghost">
              Launch a plan
            </Link>
          </div>
          <dl className="grid grid-cols-3 gap-3 mt-12 max-w-lg">
            <Stat label="Plans" value={plans.length} />
            <Stat label="Active passes" value={activePasses} />
            <Stat label="On resale" value={listings.length} />
          </dl>
        </div>
        <HeroPass />
      </section>

      <section className="mt-28">
        <div className="label">How it works</div>
        <h2 className="text-3xl sm:text-[44px] font-bold mt-3 max-w-3xl leading-tight">
          Four steps. <span className="grad-text">All on-chain.</span>
        </h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-4">
          {[
            ["Issue", "A company creates a plan: price, length and resale royalty.", "◆"],
            ["Buy", "Pay in USDC and receive a pass account with a fixed expiry.", "◇"],
            ["Resell", "List it. The price drops every second until someone buys.", "↘"],
            ["Settle", "One transaction pays you and the issuer and moves the pass.", "⚡"],
          ].map(([t, d, icon], i) => (
            <li key={t} className="ticket p-6">
              <div className="flex items-center justify-between">
                <span className="num text-sm grad-text font-medium">0{i + 1}</span>
                <span className="text-xl text-muted" aria-hidden>
                  {icon}
                </span>
              </div>
              <h3 className="text-xl font-semibold mt-6">{t}</h3>
              <p className="text-sm text-ink-2 mt-2 leading-relaxed">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-28 grid gap-5 lg:grid-cols-[1fr_1.1fr] items-center">
        <div>
          <div className="label">Try it</div>
          <h2 className="text-3xl sm:text-[40px] font-bold mt-3 leading-tight">
            See what your unused days are worth.
          </h2>
          <p className="text-ink-2 mt-4 leading-relaxed max-w-md">
            Drag to the day you&apos;d stop using a 30-day, 30 USDC pass. The buyer pays for the
            time left, you get it back, and the issuer takes a 10% royalty.
          </p>
        </div>
        <DecayDemo />
      </section>

      <section className="mt-28 grid gap-4 md:grid-cols-3">
        {[
          [
            "Why Solana",
            "Reselling 3 days of access only works if settling it costs almost nothing. Solana confirms in about a second for a fraction of a cent.",
          ],
          [
            "Why issuers say yes",
            "They keep 100% of the first sale. Days that used to be shared for free now pay them a royalty, and every resale brings a new user.",
          ],
          [
            "Why buyers win",
            "Need a tool for a week? Buy a pass someone finished with, below the new price, with the exact time left shown on-chain.",
          ],
        ].map(([t, d]) => (
          <div key={t} className="panel p-7">
            <h3 className="text-lg font-semibold">{t}</h3>
            <p className="text-ink-2 mt-3 leading-relaxed">{d}</p>
          </div>
        ))}
      </section>

      <section className="mt-28 panel p-10 sm:p-14 text-center relative overflow-hidden">
        <div className="orb w-72 h-72 bg-[#9945ff] -left-20 -top-20" />
        <div className="orb w-72 h-72 bg-[#14f195] -right-20 -bottom-24" />
        <h2 className="relative text-3xl sm:text-5xl font-bold leading-tight">
          Time is an asset. <span className="grad-text">Trade it.</span>
        </h2>
        <p className="relative text-ink-2 mt-4 max-w-xl mx-auto">
          Connect a Solana wallet, grab 500 test USDC and buy your first pass in under a minute.
        </p>
        <div className="relative flex flex-wrap justify-center gap-3 mt-8">
          <Link href="/passes" className="btn btn-primary">
            Get test USDC
          </Link>
          <Link href="/market" className="btn btn-ghost">
            Browse passes
          </Link>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel px-4 py-3.5">
      <dt className="label">{label}</dt>
      <dd className="num text-2xl sm:text-3xl mt-1">{value}</dd>
    </div>
  );
}

/** A pass card in 3D that tilts toward the cursor and counts down live. */
function HeroPass() {
  const ref = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(20 * 86400);

  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 20 * 86400)), 1000);
    return () => clearInterval(id);
  }, []);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${x * 16}deg) rotateX(${-y * 14}deg)`;
    el.style.setProperty("--sheen", `${x * 60}%`);
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = "rotateY(-14deg) rotateX(8deg)";
  };

  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const pct = (left / (30 * 86400)) * 100;
  const price = (30 * left) / (30 * 86400);

  return (
    <div className="stage relative" onPointerMove={onMove} onPointerLeave={reset}>
      <div className="orb w-64 h-64 bg-[#9945ff] left-4 top-6" />
      <div className="orb w-56 h-56 bg-[#14f195] right-6 bottom-0" />
      <div className="float">
        <div ref={ref} className="pass3d" style={{ transform: "rotateY(-14deg) rotateX(8deg)" }}>
          <div className="pass3d-face">
            <div className="p-7 sm:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="label">Liquid Pass · #0007</div>
                  <div className="font-display text-2xl sm:text-[28px] font-semibold mt-2">AI Writer Pro</div>
                  <div className="text-sm text-ink-2 mt-1">30-day plan · 10% resale royalty</div>
                </div>
                <span className="chip chip-live">
                  <span className="pulse" /> Active
                </span>
              </div>

              <div className="mt-9 flex items-end justify-between gap-4">
                <div>
                  <div className="label">Time left</div>
                  <div className="num text-3xl sm:text-4xl mt-1.5">
                    {d}d {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:
                    {String(s).padStart(2, "0")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="label">Resale now</div>
                  <div className="num text-2xl mt-1.5 grad-text font-medium">{price.toFixed(4)}</div>
                  <div className="text-xs text-muted num">USDC · was 30.00</div>
                </div>
              </div>
              <div className="meter mt-5">
                <span style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="ticket-cut mx-0 px-7 sm:px-8 py-5 flex items-center justify-between gap-4" style={{ ["--paper" as string]: "#0b0915" }}>
              <div className="flex gap-[3px] items-end h-8" aria-hidden>
                {Array.from({ length: 34 }).map((_, i) => (
                  <span
                    key={i}
                    className="bg-white/70 rounded-[1px]"
                    style={{ width: i % 3 === 0 ? 3 : 1.5, height: `${60 + ((i * 37) % 40)}%` }}
                  />
                ))}
              </div>
              <div className="text-right">
                <div className="label">Owner</div>
                <div className="num text-sm mt-0.5">7xKp…9fQe</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Interactive example: a 30-day, 30 USDC pass resold after `day` days. */
function DecayDemo() {
  const [day, setDay] = useState(10);
  const left = 30 - day;
  const value = (30 * left) / 30;
  const royalty = value * 0.1;

  return (
    <div className="ticket">
      <div className="p-7">
        <div className="flex items-start justify-between">
          <div>
            <div className="label">Example pass</div>
            <div className="text-xl font-semibold font-display mt-1.5">AI Writer Pro · 30 days</div>
          </div>
          <span className={`chip ${left > 7 ? "chip-live" : "chip-warn"}`}>{left} days left</span>
        </div>
        <label className="label block mt-7" htmlFor="day">
          You stop using it on day {day}
        </label>
        <input
          id="day"
          type="range"
          min={1}
          max={29}
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className="w-full mt-3 accent-[#9945ff]"
        />
        <div className={`meter mt-4 ${left <= 7 ? "low" : ""}`}>
          <span style={{ width: `${(left / 30) * 100}%` }} />
        </div>
      </div>
      <div className="ticket-cut p-7 grid grid-cols-3 gap-4">
        <Cell label="Buyer pays" value={value} strong />
        <Cell label="You get back" value={value - royalty} />
        <Cell label="Issuer royalty" value={royalty} />
      </div>
    </div>
  );
}

function Cell({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`num mt-1.5 ${strong ? "text-3xl grad-text font-medium" : "text-2xl"}`}>{value.toFixed(2)}</div>
      <div className="text-xs text-muted mt-0.5">USDC</div>
    </div>
  );
}
