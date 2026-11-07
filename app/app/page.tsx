"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useChain } from "@/components/ChainData";
import { planLength, usdc } from "@/lib/format";

export default function Home() {
  const { plans, passes, listings, now } = useChain();
  const activePasses = passes.filter((p) => p.expiry.toNumber() > now).length;
  const openPlans = plans
    .filter((p) => p.active)
    .sort((a, b) => b.createdAt.toNumber() - a.createdAt.toNumber())
    .slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="bleed bg-white overflow-hidden">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 text-center">
          <div className="eyebrow eyebrow-new rise">New · Live on Solana devnet</div>
          <h1 className="rise rise-2 text-[44px] sm:text-[80px] leading-[1.03] mt-3 tracking-[-0.035em]">
            Paid for 30 days?
            <br />
            <span className="grad-text">Sell the other 20.</span>
          </h1>
          <p className="rise rise-3 text-[19px] sm:text-[24px] leading-[1.35] text-ink-2 mt-5 max-w-[640px] mx-auto tracking-[-0.02em]">
            A subscription you own. Use the days you need, resell the rest, and the issuer earns on
            every resale.
          </p>
          <div className="rise rise-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 mt-8">
            <Link href="/market" className="btn btn-primary">
              Explore the market
            </Link>
            <Link href="/issuer" className="link text-[17px]">
              Launch a plan <Chevron />
            </Link>
          </div>
          <div className="mt-16 sm:mt-20 max-w-[560px] mx-auto">
            <HeroPass />
          </div>
        </div>
      </section>

      {/* Live numbers */}
      <section className="pt-14 sm:pt-16">
        <dl className="grid grid-cols-3 gap-3 sm:gap-5">
          <Stat label="Plans on-chain" value={plans.length} />
          <Stat label="Active passes" value={activePasses} />
          <Stat label="On resale now" value={listings.length} />
        </dl>
      </section>

      {/* Live plans shelf */}
      <section className="pt-16 sm:pt-20">
        <SectionHead title="The latest." rest="Plans live on Solana right now." />
        <div className="shelf mt-6">
          {openPlans.length > 0
            ? openPlans.map((plan, i) => (
                <article key={plan.address.toBase58()} className="ticket p-7 flex flex-col min-h-[300px]">
                  <div className="eyebrow eyebrow-new">{i === 0 ? "New" : "Available"}</div>
                  <h3 className="text-[24px] sm:text-[28px] leading-[1.15] mt-1.5 line-clamp-2">{plan.name}</h3>
                  <p className="text-[14px] text-muted mt-2">
                    {planLength(plan.duration.toNumber())} · {plan.royaltyBps / 100}% resale royalty
                  </p>
                  <MiniPass />
                  <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                    <p className="text-[12px] leading-[1.35] text-ink-2">
                      <span className="num">{usdc(plan.price)} USDC</span>
                      <br />
                      <span className="text-muted">{plan.sold.toString()} sold so far</span>
                    </p>
                    <Link href="/market" className="btn btn-primary btn-sm">
                      Buy
                    </Link>
                  </div>
                </article>
              ))
            : [0, 1, 2].map((i) => (
                <div key={i} className="ticket p-7 min-h-[300px] flex flex-col">
                  <div className="h-3 w-16 rounded bg-card-2" />
                  <div className="h-7 w-40 rounded bg-card-2 mt-3" />
                  <div className="h-4 w-28 rounded bg-card-2 mt-3" />
                  <div className="mt-auto h-8 w-16 rounded-full bg-card-2 self-end" />
                </div>
              ))}
          <Link href="/issuer" className="ticket p-7 flex flex-col min-h-[300px] !bg-black text-white overflow-hidden relative">
            <div
              className="absolute -right-24 -bottom-24 w-72 h-72 rounded-full blur-3xl opacity-70 pointer-events-none"
              style={{ background: "radial-gradient(circle, #9945ff, #0fbf83 60%, transparent 70%)" }}
            />
            <div className="eyebrow text-white/60 relative">For issuers</div>
            <h3 className="text-[24px] sm:text-[28px] leading-[1.15] mt-1.5 relative">
              Your plan here.
            </h3>
            <p className="text-[14px] text-white/70 mt-2 relative">
              Set a price, a length and a royalty. Live in one transaction.
            </p>
            <span className="mt-auto relative text-[#2997ff] inline-flex items-center gap-0.5 text-[15px]">
              Launch a plan <Chevron />
            </span>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="pt-10">
        <SectionHead title="How it works." rest="Four steps. All on-chain." />
        <ol className="shelf mt-6 [grid-auto-columns:minmax(250px,1fr)]">
          {STEPS.map((s, i) => (
            <li
              key={s.t}
              className={`ticket p-7 min-h-[340px] flex flex-col overflow-hidden ${
                i === 0 ? "!bg-[#000] text-white" : ""
              }`}
            >
              <div className={`eyebrow ${i === 0 ? "text-white/60" : "text-muted"}`}>Step {i + 1}</div>
              <h3 className="text-[28px] leading-[1.1] mt-1.5">{s.t}</h3>
              <p className={`text-[15px] leading-[1.45] mt-2 ${i === 0 ? "text-white/75" : "text-ink-2"}`}>{s.d}</p>
              <div className="mt-auto pt-8">
                <span className={`block text-[96px] font-semibold leading-none tracking-[-0.06em] ${i === 0 ? "grad-text" : "text-[#e8e8ed]"}`}>
                  0{i + 1}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Try it */}
      <section className="pt-10">
        <SectionHead title="Try it." rest="See what your unused days are worth." />
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.15fr] items-stretch">
          <div className="panel p-8 sm:p-10 flex flex-col justify-center">
            <h3 className="text-[28px] sm:text-[32px] leading-[1.12]">
              Stop early. <span className="soft">Get paid for the rest.</span>
            </h3>
            <p className="text-ink-2 mt-4 leading-[1.5]">
              Drag to the day you&apos;d stop using a 30-day, 30 USDC pass. The buyer pays for the
              time left, you get it back, and the issuer takes a 10% royalty, all in one Solana
              transaction.
            </p>
            <Link href="/passes" className="link mt-5">
              Sell a pass you own <Chevron />
            </Link>
          </div>
          <DecayDemo />
        </div>
      </section>

      {/* Why */}
      <section className="pt-16 sm:pt-20">
        <SectionHead title="Why Liquid Pass." rest="Even more reasons to switch." />
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {WHY.map((w) => (
            <div key={w.t} className="panel p-8 flex flex-col">
              <span className="w-11 h-11 rounded-full bg-card-2 grid place-items-center text-ink">{w.icon}</span>
              <h3 className="text-[21px] leading-[1.2] mt-5">{w.t}</h3>
              <p className="text-[15px] text-ink-2 mt-2 leading-[1.5]">{w.d}</p>
              <Link href={w.href} className="link text-[15px] mt-5">
                {w.cta} <Chevron />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits band */}
      <section className="bleed bg-white mt-20 border-y border-line">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-14 grid gap-10 sm:grid-cols-3 text-center">
          {BAND.map((b) => (
            <div key={b.t} className="flex flex-col items-center">
              <span className="text-muted">{b.icon}</span>
              <h4 className="text-[17px] font-semibold mt-3 tracking-[-0.02em]">{b.t}</h4>
              <p className="text-[14px] text-muted mt-1 max-w-[240px] leading-[1.4]">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing tile */}
      <section className="pt-20">
        <div className="rounded-[28px] bg-black text-white text-center px-6 py-20 sm:py-24 relative overflow-hidden">
          <div
            className="absolute inset-x-0 -bottom-40 h-80 opacity-60 blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(50% 50% at 50% 50%, #9945ff 0%, #0fbf83 45%, transparent 70%)" }}
          />
          <div className="relative">
            <div className="eyebrow text-white/60">Liquid Pass</div>
            <h2 className="text-[40px] sm:text-[64px] leading-[1.05] mt-2 tracking-[-0.035em]">
              Time is an asset.
              <br />
              <span className="grad-text">Trade it.</span>
            </h2>
            <p className="text-white/70 text-[17px] sm:text-[21px] mt-4 max-w-xl mx-auto">
              Connect a Solana wallet, grab 500 test USDC and buy your first pass in under a minute.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 mt-8">
              <Link href="/passes" className="btn btn-primary">
                Get test USDC
              </Link>
              <Link href="/market" className="text-[#2997ff] hover:underline inline-flex items-center gap-0.5">
                Browse passes <Chevron />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

const STEPS = [
  { t: "Issue", d: "A company creates a plan with a price, a length and a resale royalty." },
  { t: "Buy", d: "Pay in USDC and receive a pass account with a fixed expiry." },
  { t: "Resell", d: "Done early? List it. The price drops every second until someone buys." },
  { t: "Settle", d: "One transaction pays you and the issuer, and moves the pass." },
];

const WHY = [
  {
    t: "Built on Solana.",
    d: "Reselling three days of access only works if settling it costs almost nothing. Solana confirms in about a second for a fraction of a cent.",
    cta: "Verify a pass",
    href: "/verify",
    icon: <BoltIcon />,
  },
  {
    t: "Issuers earn more.",
    d: "They keep all of the first sale. Days that used to be shared for free now pay them a royalty, and every resale brings in a new user.",
    cta: "Launch a plan",
    href: "/issuer",
    icon: <CoinsIcon />,
  },
  {
    t: "Buyers pay less.",
    d: "Need a tool for a week? Buy a pass someone finished with, below the new price, with the exact time left shown on-chain.",
    cta: "Shop resale",
    href: "/market",
    icon: <TagIcon />,
  },
];

const BAND = [
  { t: "Settles in about a second", d: "Payment, royalty and transfer happen in one transaction.", icon: <BoltIcon size={30} /> },
  { t: "Fair price, every second", d: "Resale prices fall linearly to zero at expiry. No guesswork.", icon: <ClockIcon /> },
  { t: "Access anyone can check", d: "Apps read ownership and expiry straight from Solana.", icon: <ShieldIcon /> },
];

function SectionHead({ title, rest }: { title: string; rest: string }) {
  return (
    <h2 className="text-[24px] sm:text-[28px] leading-[1.15]">
      {title} <span className="soft">{rest}</span>
    </h2>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel px-4 sm:px-6 py-5 sm:py-6 text-center">
      <dd className="num text-[32px] sm:text-[44px] font-semibold leading-none tracking-[-0.03em]">{value}</dd>
      <dt className="text-[12px] sm:text-[14px] text-muted mt-2">{label}</dt>
    </div>
  );
}

function Chevron() {
  return (
    <svg width="9" height="14" viewBox="0 0 9 14" aria-hidden className="ml-0.5 mt-px">
      <path d="M1.5 1.5 7 7l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A small flat pass used inside shelf cards. */
function MiniPass() {
  return (
    <div className="mt-6 rounded-2xl bg-gradient-to-br from-[#fbfbfd] to-[#e9ebf0] border border-black/5 p-4 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: "var(--grad)" }} />
      <div className="flex items-center justify-between text-[11px] text-muted">
        <span>Liquid Pass</span>
        <span className="inline-flex items-center gap-1 text-live">
          <span className="pulse" /> Active
        </span>
      </div>
      <div className="meter mt-4">
        <span style={{ width: "72%" }} />
      </div>
    </div>
  );
}

/** A titanium pass card that tilts toward the pointer and counts down live. */
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
    el.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 12}deg)`;
    el.style.setProperty("--sheen", `${x * 60}%`);
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = "rotateX(14deg)";
  };

  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const pct = (left / (30 * 86400)) * 100;
  const price = (30 * left) / (30 * 86400);

  return (
    <div className="stage" onPointerMove={onMove} onPointerLeave={reset}>
      <div className="float">
        <div ref={ref} className="pass3d" style={{ transform: "rotateX(14deg)" }}>
          <div className="pass3d-face text-left">
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[12px] text-muted font-medium flex items-center gap-1.5">
                    <Image src="/brand/logo.png" alt="" width={18} height={18} /> Liquid Pass · No. 0007
                  </div>
                  <div className="text-[24px] sm:text-[30px] font-semibold tracking-[-0.03em] mt-1">AI Writer Pro</div>
                  <div className="text-[13px] text-muted mt-0.5">30-day plan · 10% resale royalty</div>
                </div>
                <span className="chip chip-live">
                  <span className="pulse" /> Active
                </span>
              </div>

              <div className="mt-8 sm:mt-10 flex items-end justify-between gap-4">
                <div>
                  <div className="text-[12px] text-muted">Time left</div>
                  <div className="num text-[28px] sm:text-[36px] font-semibold tracking-[-0.03em] mt-0.5">
                    {d}d {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] text-muted">Resale now</div>
                  <div className="num text-[22px] sm:text-[26px] font-semibold tracking-[-0.03em] mt-0.5">
                    {price.toFixed(4)}
                  </div>
                  <div className="text-[11px] text-muted num">USDC · was 30.00</div>
                </div>
              </div>
              <div className="meter mt-5">
                <span style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div
              className="ticket-cut px-6 sm:px-8 py-4 flex items-center justify-between gap-4"
              style={{ ["--notch" as string]: "#ffffff" }}
            >
              <div className="flex gap-[3px] items-end h-7" aria-hidden>
                {Array.from({ length: 32 }).map((_, i) => (
                  <span
                    key={i}
                    className="bg-ink/80 rounded-[1px]"
                    style={{ width: i % 3 === 0 ? 2.5 : 1.25, height: `${60 + ((i * 37) % 40)}%` }}
                  />
                ))}
              </div>
              <div className="text-right">
                <div className="text-[11px] text-muted">Owner</div>
                <div className="num text-[13px] font-medium">7xKp…9fQe</div>
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
    <div className="ticket hover:!transform-none">
      <div className="p-7 sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] text-muted">Example pass</div>
            <div className="text-[21px] font-semibold tracking-[-0.02em] mt-0.5">AI Writer Pro · 30 days</div>
          </div>
          <span className={`chip ${left > 7 ? "chip-live" : "chip-warn"}`}>{left} days left</span>
        </div>
        <label className="block text-[14px] text-ink-2 mt-7" htmlFor="day">
          You stop using it on day <span className="num font-semibold text-ink">{day}</span>
        </label>
        <input
          id="day"
          type="range"
          min={1}
          max={29}
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className="w-full mt-3 accent-[#0071e3]"
        />
        <div className={`meter mt-4 ${left <= 7 ? "low" : ""}`}>
          <span style={{ width: `${(left / 30) * 100}%` }} />
        </div>
      </div>
      <div className="ticket-cut p-7 sm:p-8 grid grid-cols-3 gap-4">
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
      <div className="text-[12px] text-muted">{label}</div>
      <div
        className={`num mt-1 font-semibold tracking-[-0.03em] ${strong ? "text-[30px] sm:text-[34px] text-blue" : "text-[22px] sm:text-[26px]"}`}
      >
        {value.toFixed(2)}
      </div>
      <div className="text-[12px] text-muted">USDC</div>
    </div>
  );
}

/* ---------------------------------------------------------------- icons */

function BoltIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden>
      <path d="M13 2 4.5 13.5H12L11 22l8.5-11.5H12L13 2Z" />
    </svg>
  );
}
function CoinsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <ellipse cx="9" cy="7" rx="6" ry="3" />
      <path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7" />
      <path d="M9 17c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.7-2.7-3-6-3" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden>
      <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" />
      <circle cx="8" cy="8" r="1.5" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden>
      <path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.3 7.5 9.5 4.3-1.2 7.5-5 7.5-9.5V6L12 3Z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" strokeLinecap="round" />
    </svg>
  );
}
