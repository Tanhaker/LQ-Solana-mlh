"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useChain } from "@/components/ChainData";
import Split from "@/components/Split";
import {
  BoltSticker,
  BurstSticker,
  CardSticker,
  ClockSticker,
  CoinSticker,
  HourglassSticker,
  TagSticker,
  TicketSticker,
} from "@/components/Stickers";
import { duration, planLength, usdc } from "@/lib/format";
import { currentPrice } from "@/lib/program";

const COLORS = ["#ffd731", "#4da2ff", "#fb4903", "#e9ccff", "#55db9c"];
const d = (ms: number) => ({ ["--d" as string]: `${ms}ms` }) as React.CSSProperties;

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <LivePlans />
      <GetBand />
      <ForEveryone />
      <Proof />
    </>
  );
}

/* ================================================================== hero */

function Hero() {
  return (
    <section className="sheet !bg-[var(--sky)]">
      {/* Rendered foam tube (scripts/render-tube.py). It starts above the sheet's
          top edge so the parallax never reveals a cut end. */}
      <div className="absolute inset-x-0 -top-[14vh] h-[max(62.5vw,118vh)] pointer-events-none para" data-scroll style={{ ["--amt" as string]: "-220px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/tube.webp" alt="" fetchPriority="high" decoding="async" className="tube-in w-full h-full object-cover object-center" />
      </div>

      <div className="relative pt-[120px] sm:pt-[150px] pb-16 sm:pb-24 px-4 text-center">
        <div className="relative inline-block">
          <h1 className="display text-[clamp(104px,22vw,330px)] leading-[0.8] tracking-[-0.01em]">
            <Split text="Liquid" delay={80} step={70} />
            <br />
            <Split text="Pass" delay={420} step={70} />
          </h1>
          <span className="pop absolute w-[22%] min-w-[84px] -left-[16%] top-[2%]" style={d(700)}>
            <TicketSticker className="bob w-full rotate-[-18deg]" />
          </span>
          <span className="pop absolute w-[17%] min-w-[64px] left-[52%] top-[30%]" style={d(850)}>
            <CoinSticker className="bob bob-2 w-full" />
          </span>
          <span className="pop absolute w-[20%] min-w-[78px] -right-[14%] top-[44%]" style={d(1000)}>
            <TagSticker className="bob bob-3 w-full rotate-[12deg]" />
          </span>
          <span className="pop absolute w-[11%] min-w-[44px] -left-[9%] bottom-[2%]" style={d(1150)}>
            <HourglassSticker className="bob w-full rotate-[14deg]" />
          </span>
        </div>

        <p className="mt-8 sm:mt-10 text-[34px] sm:text-[64px] lg:text-[80px] leading-[1] tracking-[-0.035em] font-bold">
          <Split text="Your time. Unlocked." delay={700} step={28} />
        </p>
        <p data-reveal style={d(900)} className="mt-4 text-[17px] sm:text-[21px] max-w-[620px] mx-auto text-ink-2">
          Paid for 30 days? Use the days you need, sell the other 20, and the issuer earns on every resale.
        </p>
        <div data-reveal style={d(1050)} className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/market" className="btn">
            Explore the market
          </Link>
          <Link href="/passes" className="btn !pl-2">
            <span className="w-10 h-10 rounded-full border-[2.5px] border-black bg-[var(--green)] grid place-items-center text-[18px] font-extrabold">
              $
            </span>
            Get 500 test USDC
          </Link>
        </div>
      </div>

      <Showcase />

      {/* Type composition */}
      <div className="relative px-4 pt-10 sm:pt-16 pb-20 sm:pb-32">
        <div className="display text-[clamp(64px,13vw,190px)] leading-[0.86] max-w-[1200px] mx-auto">
          <div className="flex items-center justify-center gap-[2vw] flex-wrap">
            <Split text="Buy" step={60} />
            <span data-reveal style={d(150)} className="w-[0.9em]">
              <CoinSticker className="w-full bob" />
            </span>
            <span className="slant">
              <Split text="what you need" delay={150} step={30} />
            </span>
          </div>
          <div className="flex items-center justify-center gap-[2vw] flex-wrap">
            <span data-reveal className="w-[0.75em]">
              <BurstSticker className="w-full spin-slow" color="#55db9c" label="OK" ink="#000" />
            </span>
            <Split text="Sell" delay={100} step={60} />
            <span data-reveal style={d(300)}>
              <Link
                href="/market"
                className="group h-[0.82em] inline-flex items-center gap-[0.12em] pl-[0.08em] pr-[0.22em] rounded-[0.14em] border-[3px] border-black bg-[var(--violet)] text-white hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_#000] transition-all"
              >
                <span className="h-[0.66em] aspect-square rounded-[0.08em] bg-white border-[3px] border-black grid place-items-center">
                  <Image src="/brand/logo.png" alt="" width={120} height={120} className="w-[78%] h-auto group-hover:rotate-[-20deg] transition-transform" />
                </span>
                <span className="font-sans font-bold text-[0.16em] tracking-[0.02em] uppercase">Open market ↗</span>
              </Link>
            </span>
          </div>
          <div className="flex items-center justify-center gap-[2vw] flex-wrap">
            <span className="slant">
              <Split text="the rest" delay={100} step={45} />
            </span>
            <span data-reveal style={d(250)} className="w-[0.9em]">
              <CardSticker className="w-full bob bob-2" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================ showcase */

const STAGES = [
  { k: "01", t: "Buy", d: "Pay once in USDC. The pass is yours, with a fixed expiry." },
  { k: "02", t: "Resell", d: "Done early? List it. The price falls a little every second." },
  { k: "03", t: "Settle", d: "One transaction pays the seller and the issuer, and moves the pass." },
];

/**
 * A tall section whose black stage stays pinned while you scroll: the box
 * grows to full bleed, the two cards turn in 3D, and their faces flip through
 * Buy, Resell and Settle.
 */
function Showcase() {
  const ref = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const on = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
      setStage(p < 0.38 ? 0 : p < 0.7 ? 1 : 2);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const left = [<HeroPass key="a" />, <ListingCard key="b" />, <ReceiptCard key="c" />];
  const right = [<LiveResaleCard key="a" />, <PriceChartCard key="b" />, <VerifyMock key="c" />];

  return (
    <div ref={ref} className="pin" data-scroll="pin">
      <div className="pin-stage">
        <div className="pin-box">
          <div className="absolute top-0 inset-x-0 z-10 px-5 sm:px-10 pt-[calc(20px+56px*var(--g))] sm:pt-[calc(28px+60px*var(--g))] flex items-center justify-between gap-3">
            <div className="flex gap-1.5 sm:gap-2">
              {STAGES.map((s, i) => (
                <span
                  key={s.k}
                  className={`h-9 sm:h-10 px-3 sm:px-4 inline-flex items-center gap-2 rounded-full border-[2.5px] text-[11px] sm:text-[13px] font-bold uppercase tracking-[0.03em] transition-colors duration-300 ${
                    i === stage ? "bg-[var(--yellow)] text-black border-[var(--yellow)]" : "border-white/40 text-white/60"
                  }`}
                >
                  <span className="num">{s.k}</span>
                  <span className={i === stage ? "" : "hidden sm:inline"}>{s.t}</span>
                </span>
              ))}
            </div>
            <span className="hidden sm:inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.05em] text-white/60">
              <span className="pulse text-[var(--green)]" /> Solana devnet
            </span>
          </div>

          <div className="absolute inset-0 grid md:grid-cols-2 gap-8 lg:gap-14 items-center px-6 sm:px-12 lg:px-20 pt-36 pb-28">
            <div className="pin-card-l min-w-0 max-w-[460px] w-full justify-self-center">
              <div key={`l${stage}`} className="flip-in">
                {left[stage]}
              </div>
            </div>
            <div className="pin-card-r min-w-0 max-w-[460px] w-full justify-self-center hidden md:block">
              <div key={`r${stage}`} className="flip-in" style={{ animationDelay: "90ms" }}>
                {right[stage]}
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 inset-x-0 z-10 px-5 sm:px-10 pb-6 sm:pb-8 flex items-end justify-between gap-6">
            <p key={stage} className="rise text-[16px] sm:text-[20px] font-bold max-w-[520px] leading-snug">
              {STAGES[stage].d}
            </p>
            <span className="display text-[64px] sm:text-[96px] leading-[0.8] text-white/15 num">{STAGES[stage].k}</span>
          </div>
          <div className="pin-bar absolute bottom-0 inset-x-0 h-[6px] bg-white/10">
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}

function useTicker(start: number) {
  const [left, setLeft] = useState(start);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : start)), 1000);
    return () => clearInterval(id);
  }, [start]);
  return left;
}

/** A pass card that tilts toward the pointer and counts down live. */
function HeroPass() {
  const ref = useRef<HTMLDivElement>(null);
  const left = useTicker(20 * 86400);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 12}deg)`;
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = "none";
  };

  const dd = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const pct = (left / (30 * 86400)) * 100;
  const price = (30 * left) / (30 * 86400);

  return (
    <div className="stage" onPointerMove={onMove} onPointerLeave={reset}>
      <div ref={ref} className="pass3d">
        <div className="pass3d-face text-left !shadow-[10px_10px_0_var(--violet)] !border-white">
          <div className="bg-[var(--yellow)] border-b-[3px] border-black px-5 sm:px-6 py-3 flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.05em] flex items-center gap-2">
              <Image src="/brand/logo.png" alt="" width={20} height={20} /> Liquid Pass · No. 0007
            </span>
            <span className="chip chip-live">
              <span className="pulse" /> Active
            </span>
          </div>
          <div className="p-5 sm:p-7">
            <div className="display text-[40px] sm:text-[52px]">AI Writer Pro</div>
            <div className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.04em] text-muted mt-1">30-day plan · 10% royalty</div>
            <div className="mt-5 flex items-end justify-between gap-4">
              <div>
                <div className="label">Time left</div>
                <div className="num text-[22px] sm:text-[34px] font-extrabold tracking-[-0.03em] mt-0.5 whitespace-nowrap">
                  {dd}d {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
                </div>
              </div>
              <div className="text-right">
                <div className="label">Resale now</div>
                <div className="num text-[20px] sm:text-[26px] font-extrabold tracking-[-0.03em] mt-0.5">{price.toFixed(4)}</div>
              </div>
            </div>
            <div className="meter mt-4">
              <span style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="ticket-cut px-5 sm:px-7 py-4 flex items-center justify-between gap-4" style={{ ["--notch" as string]: "#000" }}>
            <div className="flex gap-[3px] items-end h-7" aria-hidden>
              {Array.from({ length: 26 }).map((_, i) => (
                <span key={i} className="bg-black" style={{ width: i % 3 === 0 ? 3 : 1.5, height: `${60 + ((i * 37) % 40)}%` }} />
              ))}
            </div>
            <div className="text-right">
              <div className="label">Owner</div>
              <div className="num text-[13px] font-bold">7xKp…9fQe</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The cheapest live resale listing on devnet, ticking down every second. */
function LiveResaleCard() {
  const { plans, passes, listings, now } = useChain();
  const rows = listings
    .map((l) => {
      const pass = passes.find((p) => p.address.equals(l.pass));
      const plan = pass && plans.find((p) => p.address.equals(pass.plan));
      return pass && plan && pass.expiry.toNumber() > now ? { l, pass, plan, price: currentPrice(l, pass, now) } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.price.cmp(b.price));
  const top = rows[0];

  return (
    <div className="rounded-[28px] border-[3px] border-white bg-[var(--lilac)] text-black overflow-hidden shadow-[10px_10px_0_var(--green)]">
      <div className="px-5 sm:px-6 py-3 border-b-[3px] border-black bg-white flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.05em]">Live on devnet · resale</span>
        <span className="chip chip-warn">Price falling</span>
      </div>
      <div className="p-5 sm:p-7">
        <div className="display text-[40px] sm:text-[52px] truncate">{top ? top.plan.name : "Your listing"}</div>
        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <div className="label !text-black/60">Price now</div>
            <div className="num text-[36px] sm:text-[48px] font-extrabold tracking-[-0.04em] leading-none mt-1">
              {top && now ? usdc(top.price, 3) : "—"}
              <span className="text-[16px] font-bold ml-1.5">USDC</span>
            </div>
          </div>
          <div className="text-right">
            <div className="label !text-black/60">New</div>
            <div className="num text-[20px] font-bold line-through">{top ? usdc(top.plan.price) : "—"}</div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[14px] font-bold">{top && now ? `${duration(top.pass.expiry.toNumber() - now)} left` : "Reading Solana…"}</span>
          <Link href="/market" className="btn btn-primary btn-sm">
            Buy on market ↗
          </Link>
        </div>
        {rows.length > 1 && <p className="mt-4 text-[13px] font-bold text-black/60">+{rows.length - 1} more passes on resale right now</p>}
      </div>
    </div>
  );
}

function ListingCard() {
  const left = useTicker(6 * 3600);
  const price = (20.8612 * left) / (6 * 3600);
  return (
    <div className="rounded-[28px] border-[3px] border-white bg-white text-black overflow-hidden shadow-[10px_10px_0_var(--orange)]">
      <div className="px-5 sm:px-6 py-3 border-b-[3px] border-black bg-[var(--orange)] text-white flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.05em]">Your pass · listed</span>
        <span className="chip">Live</span>
      </div>
      <div className="p-5 sm:p-7">
        <div className="display text-[40px] sm:text-[52px]">AI Writer Pro</div>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <div className="label">Opening price</div>
            <div className="num text-[24px] font-extrabold mt-1">22.00</div>
          </div>
          <div>
            <div className="label">Price now</div>
            <div className="num text-[24px] font-extrabold mt-1 text-[var(--orange)]">{price.toFixed(4)}</div>
          </div>
        </div>
        <div className="meter low mt-5">
          <span style={{ width: `${(price / 22) * 100}%` }} />
        </div>
        <p className="mt-4 text-[14px] font-bold text-muted">Falls in a straight line to zero at expiry.</p>
      </div>
    </div>
  );
}

function PriceChartCard() {
  return (
    <div className="rounded-[28px] border-[3px] border-white bg-[var(--yellow)] text-black overflow-hidden shadow-[10px_10px_0_var(--blue)] p-5 sm:p-7">
      <div className="label !text-black/70">Resale price over time</div>
      <svg viewBox="0 0 300 170" className="w-full mt-4" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1="0" x2="300" y1={20 + i * 45} y2={20 + i * 45} stroke="#000" strokeOpacity="0.15" strokeWidth="2" />
        ))}
        <path d="M10 20 L290 155" stroke="#000" strokeWidth="5" strokeLinecap="round" fill="none" />
        <circle r="11" fill="#fb4903" stroke="#000" strokeWidth="3">
          <animateMotion dur="5s" repeatCount="indefinite" path="M10 20 L290 155" />
        </circle>
      </svg>
      <div className="mt-3 flex justify-between text-[12px] font-bold uppercase tracking-[0.04em]">
        <span>Listed</span>
        <span>Expiry · 0 USDC</span>
      </div>
    </div>
  );
}

function ReceiptCard() {
  const rows: [string, string][] = [
    ["Buyer paid", "18.00"],
    ["Seller receives", "16.20"],
    ["Issuer royalty 10%", "1.80"],
  ];
  return (
    <div className="rounded-[28px] border-[3px] border-white bg-white text-black overflow-hidden shadow-[10px_10px_0_var(--green)]">
      <div className="px-5 sm:px-6 py-3 border-b-[3px] border-black bg-[var(--green)] flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.05em]">Sold · one transaction</span>
        <span className="chip">~0.4 s</span>
      </div>
      <ul className="p-3 sm:p-4">
        {rows.map(([k, v], i) => (
          <li key={k} className={`flex items-center justify-between px-3 py-3.5 ${i ? "border-t-2 border-dashed border-black/25" : ""}`}>
            <span className="font-bold text-[15px]">{k}</span>
            <span className="num font-extrabold text-[20px]">{v}</span>
          </li>
        ))}
      </ul>
      <div className="px-6 pb-6 display text-[34px] sm:text-[40px]">Pass moved to buyer</div>
    </div>
  );
}

function VerifyMock() {
  return (
    <div className="rounded-[28px] border-[3px] border-white bg-white text-black p-5 sm:p-6 shadow-[10px_10px_0_var(--blue)]">
      <div className="label">Verify · Solana devnet</div>
      <div className="mt-3 rounded-[14px] border-[2.5px] border-black px-3 py-2 text-[13px] font-bold num truncate">8jSy…Bbsa</div>
      <div className="mt-3 rounded-[14px] border-[2.5px] border-black bg-[var(--green)] px-3 py-3">
        <div className="display text-[34px]">Access granted</div>
        <div className="text-[12px] font-bold mt-1">StreamBox Premium · 29d left</div>
      </div>
    </div>
  );
}

/* ============================================================== features */

function Features() {
  return (
    <section className="sheet sheet-rise" data-scroll>
      <div className="max-w-[1180px] mx-auto px-5 sm:px-10 py-20 sm:py-28">
        <h2 className="text-center text-[36px] sm:text-[64px] font-bold tracking-[-0.035em] leading-[1.05]">
          <Split text="Subscriptions you actually own." step={22} />
        </h2>

        <Row
          tile={
            <div className="tile aspect-square bg-[var(--green)]">
              <div className="absolute inset-0 grid grid-cols-3 gap-2 p-4 -rotate-[14deg] scale-125">
                {Array.from({ length: 12 }).map((_, i) => (
                  <TicketSticker key={i} className="w-full" color={i % 4 === 1 ? "#fff" : "#ffd731"} label={i % 3 ? "PASS" : "30D"} />
                ))}
              </div>
            </div>
          }
          lines={[{ t: "Launch a plan" }, { t: "in one signature" }]}
          text="Set a name, a price in USDC, a length and a resale royalty. You keep 100% of every first sale and earn the royalty on every resale after."
          cta={{ href: "/issuer", label: "Start now" }}
        />

        <Row
          flip
          tile={
            <div className="tile bg-[var(--lilac)] p-4 sm:p-8 grid place-items-center min-h-[420px]">
              <DecayDemo />
            </div>
          }
          lines={[{ t: "Resell what" }, { t: "you don't use" }]}
          text="Stopped early? List the pass. Its price falls a little every second until it reaches zero at expiry, so it always matches the time that is left."
          cta={{ href: "/passes", label: "Sell a pass" }}
        />

        <Row
          tile={
            <div className="tile aspect-square bg-[var(--blue)] grid place-items-center p-6 overflow-hidden">
              <ClockSticker className="absolute w-[34%] -right-[4%] -top-[4%] bob" />
              <BoltSticker className="absolute w-[20%] left-[6%] bottom-[6%] bob bob-2" />
              <div className="relative w-full max-w-[300px] -rotate-3">
                <VerifyMock />
              </div>
            </div>
          }
          lines={[{ t: "Access any app" }, { t: "can check", slant: true }]}
          text="Every pass is an account on Solana with an owner and an expiry. Apps read it straight from the chain. No API keys, no middleman."
          cta={{ href: "/verify", label: "Verify a pass" }}
        />
      </div>
    </section>
  );
}

function Row({
  tile,
  lines,
  text,
  cta,
  flip,
}: {
  tile: React.ReactNode;
  lines: { t: string; slant?: boolean }[];
  text: string;
  cta: { href: string; label: string };
  flip?: boolean;
}) {
  return (
    <div className="mt-20 sm:mt-32 grid gap-10 md:gap-16 md:grid-cols-2 items-center">
      <div className={flip ? "md:order-2" : ""} data-reveal>
        <div className="para" data-scroll style={{ ["--amt" as string]: "110px" }}>
          {tile}
        </div>
      </div>
      <div>
        <h3 className="display text-[56px] sm:text-[84px] lg:text-[96px]">
          {lines.map((l, i) => (
            <span key={l.t} className={`block ${l.slant ? "slant" : ""}`}>
              <Split text={l.t} delay={i * 260} step={34} />
            </span>
          ))}
        </h3>
        <p data-reveal style={d(250)} className="mt-6 text-[19px] sm:text-[23px] leading-[1.3] max-w-[520px] text-ink-2">
          {text}
        </p>
        <div data-reveal style={d(380)}>
          <Link href={cta.href} className="btn btn-primary mt-8">
            {cta.label} <Arrow />
          </Link>
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
    <div className="w-full max-w-[460px] rounded-[26px] border-[3px] border-black bg-white shadow-[8px_8px_0_#000]">
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="label">Example pass</div>
            <div className="display text-[34px] mt-1">AI Writer Pro</div>
          </div>
          <span className={`chip ${left > 7 ? "chip-live" : "chip-warn"}`}>{left} days left</span>
        </div>
        <label className="block text-[15px] font-bold mt-6" htmlFor="day">
          You stop using it on day <span className="num text-[var(--violet)]">{day}</span>
        </label>
        <input
          id="day"
          type="range"
          min={1}
          max={29}
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className="w-full mt-3 accent-[#5c4ade]"
        />
        <div className={`meter mt-4 ${left <= 7 ? "low" : ""}`}>
          <span style={{ width: `${(left / 30) * 100}%` }} />
        </div>
      </div>
      <div className="ticket-cut p-5 sm:p-7 grid grid-cols-3 gap-3" style={{ ["--notch" as string]: "var(--lilac)" }}>
        <Cell label="Buyer pays" value={value} strong />
        <Cell label="You get" value={value - royalty} />
        <Cell label="Royalty" value={royalty} />
      </div>
    </div>
  );
}

function Cell({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`num mt-1 font-extrabold tracking-[-0.03em] ${strong ? "text-[28px] sm:text-[34px] text-[var(--violet)]" : "text-[22px] sm:text-[26px]"}`}>
        {value.toFixed(2)}
      </div>
      <div className="text-[11px] font-bold text-muted">USDC</div>
    </div>
  );
}

/* ============================================================ live plans */

const PLAN_STICKERS = [
  <TicketSticker key="t" className="w-[110px]" color="#fff" />,
  <CoinSticker key="c" className="w-[96px]" color="#ffd731" />,
  <HourglassSticker key="h" className="w-[70px]" />,
  <TagSticker key="g" className="w-[110px]" />,
  <BoltSticker key="b" className="w-[70px]" />,
];

function LivePlans() {
  const { plans, passes, listings, now } = useChain();
  const open = plans.filter((p) => p.active).sort((a, b) => b.createdAt.toNumber() - a.createdAt.toNumber());
  const active = passes.filter((p) => p.expiry.toNumber() > now).length;
  const card = "shrink-0 w-[280px] sm:w-[400px] aspect-[1/1.02] tile p-6 sm:p-8 flex flex-col";

  return (
    <section className="sheet sheet-rise" data-scroll>
      <div className="px-5 sm:px-10 pt-20 sm:pt-28 pb-14 text-center">
        <h2 className="text-[36px] sm:text-[64px] font-bold tracking-[-0.035em] leading-[1.05] max-w-[900px] mx-auto">
          <Split text="Live on Solana right now. Pick a plan and own it." step={18} />
        </h2>
        <div data-reveal style={d(200)} className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/market" className="btn">
            Open the market
          </Link>
          <Link href="/issuer" className="btn">
            Launch your own plan
          </Link>
        </div>
        <div data-reveal style={d(320)} className="mt-8 flex flex-wrap justify-center gap-2">
          <Count n={plans.length} label="plans on-chain" color="#ffd731" />
          <Count n={active} label="active passes" color="#55db9c" />
          <Count n={listings.length} label="on resale now" color="#e9ccff" />
        </div>
      </div>

      {/* Slides sideways as you scroll down the page. */}
      <div className="track pb-24" data-scroll="track">
        <div className="flex gap-4 w-max px-5 sm:px-10 py-2.5">
          {open.length > 0
            ? open.map((plan, i) => (
                <Link
                  key={plan.address.toBase58()}
                  href="/market"
                  className={`${card} hover:-translate-y-2 hover:shadow-[8px_8px_0_#000] transition-[translate,box-shadow]`}
                  style={{ background: COLORS[i % COLORS.length] }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="chip">{i === 0 ? "New" : `${plan.sold.toString()} sold`}</span>
                    <span className="bob" style={{ animationDelay: `${-i * 0.9}s` }}>
                      {PLAN_STICKERS[i % PLAN_STICKERS.length]}
                    </span>
                  </div>
                  <h3
                    className={`display slant leading-[0.92] mt-auto pr-2 pt-4 ${
                      plan.name.length > 18 ? "text-[44px] sm:text-[56px]" : "text-[54px] sm:text-[70px]"
                    }`}
                  >
                    {plan.name}
                  </h3>
                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div className="font-bold text-[15px] leading-tight">
                      <span className="num text-[28px] font-extrabold">{usdc(plan.price)}</span> USDC
                      <br />
                      {planLength(plan.duration.toNumber())} · {plan.royaltyBps / 100}% royalty
                    </div>
                    <span className="w-12 h-12 rounded-full border-[3px] border-black bg-white grid place-items-center shrink-0">
                      <Arrow />
                    </span>
                  </div>
                </Link>
              ))
            : [0, 1, 2, 3].map((i) => <div key={i} className={`${card} animate-pulse`} style={{ background: COLORS[i] }} />)}
          <Link
            href="/issuer"
            className={`${card} bg-black text-white !border-black hover:-translate-y-2 hover:shadow-[8px_8px_0_var(--violet)] transition-[translate,box-shadow]`}
          >
            <BurstSticker className="w-[110px] spin-slow" color="#ffd731" label="YOU?" ink="#000" />
            <h3 className="display slant text-[54px] sm:text-[70px] leading-[0.9] mt-auto">Your plan here</h3>
            <p className="mt-4 font-bold text-white/70">Set a price, a length and a royalty. Live in one transaction.</p>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Count({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <span className="h-12 pl-1.5 pr-5 inline-flex items-center gap-3 rounded-full border-[3px] border-black bg-white font-bold uppercase text-[13px] tracking-[0.02em]">
      <span className="h-9 min-w-9 px-2 rounded-full border-[2.5px] border-black grid place-items-center num text-[16px]" style={{ background: color }}>
        {n}
      </span>
      {label}
    </span>
  );
}

/* ============================================================== get band */

function GetBand() {
  const row = (colors: string[], slant: boolean) => (
    <span className="flex shrink-0 gap-4 pr-4">
      {colors.map((c, i) => (
        <Link
          key={i}
          href="/market"
          className="display shrink-0 rounded-[28px] px-8 sm:px-10 pt-4 pb-2 text-[88px] sm:text-[150px] leading-[0.95] whitespace-nowrap hover:scale-[1.03] transition-transform"
          style={{ background: c }}
          tabIndex={-1}
        >
          <span className={slant ? "slant" : ""}>Get Liquid Pass</span>
        </Link>
      ))}
    </span>
  );
  const top = ["#4da2ff", "#ffffff", "#fb4903", "#e9ccff"];
  const bottom = ["#ffd731", "#55db9c", "#e9ccff", "#ffffff"];
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden" aria-label="Get Liquid Pass">
      <div className="drift-l" data-scroll>
        <div className="marquee" style={{ ["--speed" as string]: "60s" }}>
          {row(top, true)}
          {row(top, true)}
        </div>
      </div>
      <div className="drift-r mt-4" data-scroll>
        <div className="marquee reverse" style={{ ["--speed" as string]: "66s" }}>
          {row(bottom, false)}
          {row(bottom, false)}
        </div>
      </div>
      <TicketSticker className="bob absolute w-[120px] sm:w-[170px] left-[12%] top-[6%] rotate-[-20deg] pointer-events-none" />
      <CoinSticker className="bob bob-2 absolute w-[90px] sm:w-[130px] right-[10%] top-[40%] pointer-events-none" color="#ffd731" />
      <HourglassSticker className="bob bob-3 absolute w-[60px] sm:w-[90px] left-[38%] bottom-[8%] rotate-[18deg] pointer-events-none" />
    </section>
  );
}

/* ========================================================= for everyone */

const TABS = [
  {
    id: "buyers",
    tab: "Buyers",
    title: "Pay for the days you'll use",
    text: "Need a tool for a week? Buy a pass someone finished with, below the new price, with the exact time left shown on-chain.",
    cta: { href: "/market", label: "Shop resale" },
    color: "#fbe7c6",
    head: "Resale · price falling",
    rows: [
      ["Iron Gym Monthly", "33.98"],
      ["Rust Bootcamp", "47.99"],
      ["StreamBox Premium", "11.99"],
    ] as [string, string][],
    accent: "#fb4903",
  },
  {
    id: "sellers",
    tab: "Sellers",
    title: "Get paid for the rest",
    text: "List a pass at any price up to the original. The buyer pays, you receive your share and the pass moves, all in one transaction.",
    cta: { href: "/passes", label: "Sell a pass" },
    color: "#e9ccff",
    head: "Your pass · listed",
    rows: [
      ["Opening price", "22.00"],
      ["Price now", "20.86"],
      ["You receive", "19.82"],
    ] as [string, string][],
    accent: "#55db9c",
  },
  {
    id: "issuers",
    tab: "Issuers",
    title: "Earn on every resale",
    text: "Days that used to be shared for free now pay you a royalty, and every resale brings you a new user.",
    cta: { href: "/issuer", label: "Launch a plan" },
    color: "#ffd731",
    head: "Plan · CloudDesk Pro",
    rows: [
      ["First sales", "50.00"],
      ["Resale royalty 5%", "1.04"],
      ["Passes sold", "2"],
    ] as [string, string][],
    accent: "#4da2ff",
  },
];

function ForEveryone() {
  const [tab, setTab] = useState(0);
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const [ind, setInd] = useState({ left: 5, width: 0 });
  const t = TABS[tab];

  useLayoutEffect(() => {
    const place = () => {
      const b = btns.current[tab];
      if (b) setInd({ left: b.offsetLeft, width: b.offsetWidth });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [tab]);

  return (
    <section className="sheet sheet-rise" data-scroll>
      <div className="max-w-[1180px] mx-auto px-5 sm:px-10 py-20 sm:py-28">
        <h2 className="text-center text-[36px] sm:text-[64px] font-bold tracking-[-0.035em] leading-[1.05]">
          <Split text="Made for both sides of the deal" step={22} />
        </h2>
        <div data-reveal style={d(200)} className="mt-8 flex justify-center">
          <div className="seg" role="tablist" aria-label="Who it is for">
            <span className="seg-ind" style={{ left: ind.left, width: ind.width }} aria-hidden />
            {TABS.map((x, i) => (
              <button
                key={x.id}
                ref={(el) => {
                  btns.current[i] = el;
                }}
                role="tab"
                aria-selected={i === tab}
                aria-controls="tab-panel"
                onClick={() => setTab(i)}
                className={`transition-colors duration-300 ${i === tab ? "text-white" : "text-black"}`}
              >
                {x.tab}
              </button>
            ))}
          </div>
        </div>

        <div id="tab-panel" role="tabpanel" className="mt-14 grid gap-10 md:gap-16 md:grid-cols-2 items-center">
          <div className="tile aspect-square grid place-items-center p-6 transition-colors duration-500" style={{ background: t.color }}>
            <div key={t.id} className="flip-in w-full grid place-items-center">
              <MockCard head={t.head} rows={t.rows} accent={t.accent} />
            </div>
          </div>
          <div key={t.id}>
            <h3 className="display slant text-[60px] sm:text-[96px]">
              <Split text={t.title} step={30} />
            </h3>
            <p className="rise rise-2 mt-6 text-[19px] sm:text-[23px] leading-[1.3] max-w-[520px] text-ink-2">{t.text}</p>
            <div className="rise rise-3">
              <Link href={t.cta.href} className="btn btn-primary mt-8">
                {t.cta.label} <Arrow />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MockCard({ head, rows, accent }: { head: string; rows: [string, string][]; accent: string }) {
  return (
    <div className="w-full max-w-[340px] rounded-[26px] border-[3px] border-black bg-white shadow-[8px_8px_0_#000] overflow-hidden rotate-[-3deg]">
      <div className="px-5 py-3 border-b-[3px] border-black text-[12px] font-bold uppercase tracking-[0.05em]" style={{ background: accent }}>
        {head}
      </div>
      <ul className="p-3">
        {rows.map(([k, v], i) => (
          <li key={k} className={`flex items-center justify-between px-3 py-3.5 ${i ? "border-t-2 border-dashed border-black/25" : ""}`}>
            <span className="font-bold text-[15px]">{k}</span>
            <span className="num font-extrabold text-[18px]">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ================================================================= proof */

function Proof() {
  const { plans, passes, listings, now } = useChain();
  const active = passes.filter((p) => p.expiry.toNumber() > now).length;
  return (
    <section className="sheet sheet-rise" data-scroll>
      <div className="max-w-[1280px] mx-auto px-5 sm:px-10 py-20 sm:py-28 grid gap-10 lg:grid-cols-[1fr_1.25fr] items-center">
        <div className="relative">
          <h2 className="display text-[72px] sm:text-[120px] leading-[0.86]">
            <span className="slant block">
              <Split text="Don't" step={60} />
            </span>
            <span className="slant block">
              <Split text="trust us?" delay={260} step={45} />
            </span>
          </h2>
          <span data-reveal style={d(400)} className="absolute w-[110px] sm:w-[150px] right-0 sm:right-[8%] -top-4">
            <ClockSticker className="w-full bob" />
          </span>
          <p data-reveal style={d(300)} className="mt-6 text-[21px] sm:text-[24px]">
            Check the chain yourself.
          </p>
          <div data-reveal style={d(420)}>
            <Link href="/verify" className="btn btn-primary mt-7">
              Verify a pass <Arrow />
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div data-reveal style={d(100)} className="tile bg-[var(--lilac)] p-7 sm:p-8 min-h-[380px] flex flex-col">
            <div className="text-[19px] font-bold">Read from Solana devnet, just now</div>
            <dl className="mt-6 space-y-4">
              <Stat n={plans.length} label="Plans on-chain" />
              <Stat n={active} label="Active passes" />
              <Stat n={listings.length} label="Passes on resale" />
            </dl>
            <p className="mt-auto pt-6 text-[14px] font-bold text-black/60">Program FzUk…54Mz · Anchor 1.2</p>
          </div>
          <div data-reveal style={d(260)} className="tile bg-[var(--orange)] p-7 sm:p-8 min-h-[380px] flex flex-col">
            <div className="flex items-start justify-between">
              <BurstSticker className="w-[92px] spin-slow" color="#55db9c" label="1 TX" ink="#000" />
              <BoltSticker className="w-[58px] bob" />
            </div>
            <h3 className="display slant text-[54px] sm:text-[60px] leading-[0.9] mt-auto">Settles in about a second</h3>
            <p className="mt-3 font-bold text-[15px]">Payment, royalty and transfer in one transaction, for a fraction of a cent.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b-[3px] border-black pb-3">
      <dt className="font-bold text-[16px]">{label}</dt>
      <dd className="display text-[56px] leading-[0.8] num">{n}</dd>
    </div>
  );
}

function Arrow() {
  return (
    <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M2.5 9.5 9.5 2.5M4 2.5h5.5V8" />
    </svg>
  );
}
