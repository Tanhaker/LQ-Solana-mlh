"use client";

import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useChain } from "./ChainData";
import { cancelListing, listPass, transferPass } from "@/lib/actions";
import { parseUsdc, short, usdc } from "@/lib/format";
import { currentPrice, fairValue } from "@/lib/program";
import { USDC_DECIMALS } from "@/lib/config";

type Proposal = {
  reply: string;
  action: "list" | "cancel" | "gift" | "none";
  passAddress: string | null;
  priceUsdc: number | null;
  recipient: string | null;
  source: "ai" | "rules";
};

const toNum = (bn: { toString(): string }) => Number(bn.toString()) / 10 ** USDC_DECIMALS;

const EXAMPLES = [
  "I'm done with my pass, sell it at a fair price",
  "Sell it quickly",
  "Cancel my listing",
];

export default function Assistant() {
  const { plans, passes, listings, now, wallet, run } = useChain();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!wallet) return null;

  const planByKey = new Map(plans.map((p) => [p.address.toBase58(), p]));
  const listingByPass = new Map(listings.map((l) => [l.pass.toBase58(), l]));
  const mine = passes.filter((p) => p.owner.equals(wallet) && p.expiry.toNumber() > now);

  async function ask(text: string) {
    setBusy(true);
    setError(null);
    setProposal(null);
    try {
      const summary = mine.flatMap((pass) => {
        const plan = planByKey.get(pass.plan.toBase58());
        if (!plan) return [];
        const listing = listingByPass.get(pass.address.toBase58());
        return [
          {
            address: pass.address.toBase58(),
            plan: plan.name,
            secondsLeft: pass.expiry.toNumber() - now,
            planLengthSeconds: plan.duration.toNumber(),
            retailUsdc: toNum(plan.price),
            fairValueUsdc: toNum(fairValue(plan, pass, now)),
            listed: pass.listed,
            askingNowUsdc: listing ? toNum(currentPrice(listing, pass, now)) : null,
          },
        ];
      });
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, passes: summary }),
      });
      if (!res.ok) throw new Error(`Assistant error ${res.status}`);
      setProposal(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const pass = proposal?.passAddress ? mine.find((p) => p.address.toBase58() === proposal.passAddress) : undefined;
  const plan = pass ? planByKey.get(pass.plan.toBase58()) : undefined;

  async function confirm() {
    if (!proposal || !pass) return;
    let ok = false;
    if (proposal.action === "list" && proposal.priceUsdc !== null) {
      const price = parseUsdc(proposal.priceUsdc.toFixed(2));
      if (!price) return;
      ok = await run("List pass", (p) => listPass(p, pass, price));
    } else if (proposal.action === "cancel") {
      ok = await run("Cancel listing", (p) => cancelListing(p, pass));
    } else if (proposal.action === "gift" && proposal.recipient) {
      const to = new PublicKey(proposal.recipient);
      ok = await run("Gift pass", (p) => transferPass(p, pass, to));
    }
    if (ok) setProposal(null);
  }

  return (
    <section className="panel p-5 mt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="label">Pass assistant</div>
          <h2 className="text-xl font-bold mt-1">Tell it what you want in plain English.</h2>
        </div>
        <span className="chip chip-accent">You confirm before anything is signed</span>
      </div>

      <form
        className="flex flex-col sm:flex-row gap-2 mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (message.trim()) void ask(message.trim());
        }}
      >
        <input
          className="field"
          placeholder="e.g. I finished my project, sell my AI Writer pass at a fair price"
          value={message}
          maxLength={500}
          onChange={(e) => setMessage(e.target.value)}
          aria-label="Message to the pass assistant"
        />
        <button className="btn btn-ink" disabled={busy || !message.trim()}>
          {busy ? "Thinking…" : "Ask"}
        </button>
      </form>
      <div className="flex flex-wrap gap-2 mt-3">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            className="chip hover:border-line-strong cursor-pointer"
            onClick={() => {
              setMessage(ex);
              void ask(ex);
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-warn mt-4">{error}</p>}

      {proposal && (
        <div className="mt-5 rounded-xl border border-line bg-card-2 p-4">
          <p className="text-ink">{proposal.reply}</p>
          {proposal.action !== "none" && pass && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <dl className="text-sm grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
                <dt className="label">Action</dt>
                <dd className="font-semibold capitalize sm:col-span-2">{proposal.action}</dd>
                <dt className="label">Pass</dt>
                <dd className="sm:col-span-2">
                  {plan?.name} #{pass.number.toNumber() + 1}
                </dd>
                {proposal.priceUsdc !== null && (
                  <>
                    <dt className="label">Starting price</dt>
                    <dd className="num sm:col-span-2">
                      {proposal.priceUsdc.toFixed(2)} USDC{" "}
                      <span className="text-muted">(original {plan ? usdc(plan.price) : "—"})</span>
                    </dd>
                  </>
                )}
                {proposal.recipient && (
                  <>
                    <dt className="label">To</dt>
                    <dd className="num sm:col-span-2">{short(proposal.recipient, 6)}</dd>
                  </>
                )}
              </dl>
              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm" onClick={() => void confirm()}>
                  Confirm & sign
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setProposal(null)}>
                  Discard
                </button>
              </div>
            </div>
          )}
          <p className="label mt-3">
            {proposal.source === "ai" ? "Answered by AI" : "Answered by built-in rules (AI key not set)"}
          </p>
        </div>
      )}
    </section>
  );
}
