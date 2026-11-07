"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { useChain } from "@/components/ChainData";
import { duration, planLength } from "@/lib/format";
import { currentPrice } from "@/lib/program";

type Msg = { role: "user" | "assistant"; content: string };

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Hi, I'm Liquidity AI. Ask me how passes, resale prices and royalties work, or what's live on Solana devnet right now.",
};

const PROMPTS = [
  "What's on resale right now?",
  "How does the resale price fall?",
  "How do I get test USDC?",
  "How do issuers earn?",
];

const toUsdc = (base: { toNumber(): number }) => base.toNumber() / 1e6;

/** Site-wide assistant: a floating liquid-logo button that opens a chat panel. */
export default function LiquidityAI() {
  const { plans, passes, listings, now, wallet, balance, sol } = useChain();
  const path = usePathname();

  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false); // load the header video only once used
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const fabVideo = useRef<HTMLVideoElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setOpened(true);
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, open]);

  const playFab = () => fabVideo.current?.play().catch(() => {});
  const stopFab = () => {
    const v = fabVideo.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  };

  /** A compact snapshot of on-chain state for the model to ground its answers. */
  const liveSnapshot = () => {
    const planByKey = new Map(plans.map((p) => [p.address.toBase58(), p]));
    const passByKey = new Map(passes.map((p) => [p.address.toBase58(), p]));
    return {
      page: path,
      walletConnected: Boolean(wallet),
      usdcBalance: balance ? toUsdc(balance) : null,
      solBalance: sol,
      plans: plans.slice(0, 25).map((p) => ({
        name: p.name,
        priceUsdc: toUsdc(p.price),
        length: planLength(p.duration.toNumber()),
        royaltyPct: p.royaltyBps / 100,
        sold: p.sold.toNumber(),
        active: p.active,
      })),
      listings: listings
        .map((l) => {
          const pass = passByKey.get(l.pass.toBase58());
          const plan = pass && planByKey.get(pass.plan.toBase58());
          if (!pass || !plan || pass.expiry.toNumber() <= now) return null;
          return {
            plan: plan.name,
            priceNowUsdc: Math.round(toUsdc(currentPrice(l, pass, now)) * 1000) / 1000,
            retailUsdc: toUsdc(plan.price),
            timeLeft: duration(pass.expiry.toNumber() - now),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .slice(0, 25),
      myPasses: wallet
        ? passes
            .filter((p) => p.owner.equals(wallet))
            .slice(0, 25)
            .map((p) => ({
              plan: planByKey.get(p.plan.toBase58())?.name ?? "Unknown plan",
              timeLeft: duration(Math.max(0, p.expiry.toNumber() - now)),
              listed: p.listed,
              expired: p.expiry.toNumber() <= now,
            }))
        : [],
    };
  };

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: q.slice(0, 1200) }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // The welcome line is UI only; send the real conversation, last 12 turns.
        body: JSON.stringify({ messages: next.slice(1).slice(-12), live: liveSnapshot() }),
      });
      const data = (await res.json()) as { reply?: string };
      setMessages((m) => [...m, { role: "assistant", content: data.reply ?? "Sorry, I couldn't answer that." }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "I couldn't reach the server. Try again in a moment." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Chat panel */}
      <section
        role="dialog"
        aria-label="Liquidity AI"
        aria-hidden={!open}
        inert={!open}
        className={`lq-panel fixed z-[55] right-4 sm:right-6 bottom-[108px] sm:bottom-[138px] w-[calc(100vw-32px)] sm:w-[410px] h-[min(620px,calc(100dvh-150px))] flex flex-col overflow-hidden rounded-[30px] bg-white ${
          open ? "is-open" : ""
        }`}
      >
        <header className="relative h-[150px] shrink-0 bg-black overflow-hidden border-b-[3px] border-black">
          {opened && (
            <video
              src="/brand/liquidity-dark.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover scale-[1.15]"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={() => setMessages([WELCOME])}
              className="w-8 h-8 rounded-full bg-white text-black border-2 border-black grid place-items-center hover:bg-[var(--yellow)]"
              aria-label="Start a new conversation"
              title="New conversation"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 3v6h6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full bg-white text-black border-2 border-black grid place-items-center hover:bg-[var(--yellow)]"
              aria-label="Close Liquidity AI"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" />
              </svg>
            </button>
          </div>
          <div className="absolute left-5 bottom-4 text-white">
            <div className="display text-[34px] leading-none">Liquidity <span className="slant text-[var(--yellow)]">AI</span></div>
            <div className="text-[12px] font-bold uppercase tracking-[0.04em] text-white/75 flex items-center gap-1.5 mt-1.5">
              <span className="pulse text-[var(--green)]" /> Reads Solana devnet live
            </div>
          </div>
        </header>

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2" aria-live="polite">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`lq-bubble ${m.role === "user" ? "lq-user" : "lq-bot"}`}
            >
              {m.role === "assistant" ? <Rich text={m.content} onNavigate={() => setOpen(false)} /> : m.content}
            </div>
          ))}
          {busy && (
            <div className="lq-bubble lq-bot lq-typing" aria-label="Liquidity AI is typing">
              <span />
              <span />
              <span />
            </div>
          )}
          {messages.length === 1 && !busy && (
            <div className="flex flex-wrap gap-2 mt-3">
              {PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="text-[13px] font-bold border-2 border-black rounded-full px-3 py-1.5 bg-white hover:bg-[var(--yellow)] transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        <form
          className="shrink-0 border-t-[3px] border-black p-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={600}
            placeholder="Ask Liquidity AI"
            aria-label="Message Liquidity AI"
            className="flex-1 h-11 rounded-full border-[2.5px] border-black bg-white px-4 text-[15px] placeholder:text-faint focus:outline-none focus:shadow-[3px_3px_0_var(--violet)]"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            className="w-11 h-11 shrink-0 rounded-full border-[2.5px] border-black bg-black text-white grid place-items-center disabled:opacity-30 hover:bg-[var(--violet)] transition-colors"
            aria-label="Send"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M7 12V2M2.5 6.5 7 2l4.5 4.5" />
            </svg>
          </button>
        </form>
        <p className="shrink-0 text-center text-[11px] text-muted pb-2 -mt-1">
          AI answers can be wrong. Liquidity AI never asks for your keys.
        </p>
      </section>

      {/* Floating trigger: the liquid logo, frozen on its first frame until hovered. */}
      <div className="fixed z-[56] right-4 sm:right-6 bottom-4 sm:bottom-6 flex items-center gap-3 group">
        <span
          className={`hidden md:block pointer-events-none text-[13px] font-bold uppercase tracking-[0.02em] bg-[var(--yellow)] border-[2.5px] border-black px-3.5 py-1.5 rounded-full transition-all duration-300 ${
            open ? "opacity-0 translate-x-2" : "opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 xl:opacity-100 xl:translate-x-0"
          }`}
        >
          Ask Liquidity AI
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          onMouseEnter={playFab}
          onMouseLeave={stopFab}
          onFocus={playFab}
          onBlur={stopFab}
          aria-label={open ? "Close Liquidity AI" : "Open Liquidity AI"}
          aria-expanded={open}
          className={`lq-fab ${open ? "is-open" : ""}`}
        >
          <video
            ref={fabVideo}
            src="/brand/liquidity-light.mp4#t=0.001"
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden
          />
        </button>
      </div>
    </>
  );
}

const PAGE_NAMES: Record<string, string> = {
  "/market": "Market",
  "/passes": "My Passes",
  "/issuer": "Issuer",
  "/verify": "Verify",
};

/** Plain text with line breaks; page paths and the faucet become links. */
function Rich({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  const parts = text.replace(/\*\*(.+?)\*\*/g, "$1").split(/(\/(?:market|passes|issuer|verify)\b|faucet\.solana\.com)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\/(market|passes|issuer|verify)$/.test(p) ? (
          <Link key={i} href={p} onClick={onNavigate} className="font-bold underline decoration-2 underline-offset-2 hover:text-[var(--violet)]">
            {PAGE_NAMES[p]}
          </Link>
        ) : p === "faucet.solana.com" ? (
          <a key={i} href="https://faucet.solana.com" target="_blank" rel="noreferrer" className="font-bold underline decoration-2 underline-offset-2">
            faucet.solana.com
          </a>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}
