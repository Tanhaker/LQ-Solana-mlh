"use client";

import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useChain } from "@/components/ChainData";
import { PageHead } from "@/components/ui";
import { explorerAddress } from "@/lib/config";
import { duration, short } from "@/lib/format";

export default function VerifyPage() {
  const { plans, passes, now, wallet } = useChain();
  const [input, setInput] = useState("");
  const [planKey, setPlanKey] = useState("");
  const [checked, setChecked] = useState<string | null>(null);

  let target: PublicKey | null = null;
  try {
    target = checked ? new PublicKey(checked) : null;
  } catch {
    target = null;
  }

  const plan = plans.find((p) => p.address.toBase58() === planKey);
  // Access = the wallet owns an unexpired pass of the chosen plan (or any plan).
  const held = target
    ? passes.filter(
        (p) => p.owner.equals(target!) && p.expiry.toNumber() > now && (!plan || p.plan.equals(plan.address)),
      )
    : [];
  const best = held.sort((a, b) => b.expiry.toNumber() - a.expiry.toNumber())[0];
  const granted = Boolean(best);

  return (
    <>
      <PageHead
        eyebrow="Verify"
        title="Does this wallet have access?"
        sub="Any app or venue can answer this by reading Solana directly: the wallet must own a pass for the plan, and the pass must not be expired. No login database, no API key."
      />

      <form
        className="panel p-6 mt-10 grid gap-4 md:grid-cols-[1fr_260px_auto] items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setChecked(input.trim());
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="wallet">
            Wallet address
          </label>
          <input
            id="wallet"
            className="field num text-sm"
            placeholder="Solana address"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          {wallet && (
            <button
              type="button"
              className="text-left text-xs text-accent underline w-fit"
              onClick={() => {
                setInput(wallet.toBase58());
                setChecked(wallet.toBase58());
              }}
            >
              Use my connected wallet
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="plan">
            Plan
          </label>
          <select id="plan" className="field" value={planKey} onChange={(e) => setPlanKey(e.target.value)}>
            <option value="">Any plan</option>
            {plans.map((p) => (
              <option key={p.address.toBase58()} value={p.address.toBase58()}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-ink">Check access</button>
      </form>

      {checked && !target && (
        <div className="mt-6 rounded-xl bg-warn-soft text-warn px-4 py-3">That isn&apos;t a valid Solana address.</div>
      )}

      {target && (
        <div
          className={`mt-6 rounded-2xl p-8 border ${
            granted ? "bg-live-soft border-transparent" : "bg-warn-soft border-transparent"
          }`}
          role="status"
        >
          <div className={`label ${granted ? "text-live" : "text-warn"}`}>
            {granted ? "Access granted" : "Access denied"}
          </div>
          <div className="text-3xl sm:text-4xl font-bold font-display mt-2">
            {granted
              ? `${short(target.toBase58())} holds an active ${plans.find((p) => p.address.equals(best!.plan))?.name ?? ""} pass.`
              : `${short(target.toBase58())} has no active pass${plan ? ` for ${plan.name}` : ""}.`}
          </div>
          {granted && best && (
            <div className="mt-4 text-ink-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="num">Time left: {duration(best.expiry.toNumber() - now)}</span>
              <a className="underline" href={explorerAddress(best.address.toBase58())} target="_blank" rel="noreferrer">
                See the pass account on Solana Explorer ↗
              </a>
            </div>
          )}
        </div>
      )}

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          ["1", "Read the pass", "Each pass is an account owned by the Liquid Pass program, storing its owner and expiry."],
          ["2", "Check the owner", "The pass's owner must be the wallet asking for access. Selling the pass moves access instantly."],
          ["3", "Check the clock", "Expiry is fixed at purchase and never changes on resale, so time can't be stretched."],
        ].map(([n, t, d]) => (
          <div key={n} className="panel p-5">
            <div className="label">Step {n}</div>
            <h3 className="text-lg font-bold mt-1">{t}</h3>
            <p className="text-sm text-ink-2 mt-2">{d}</p>
          </div>
        ))}
      </section>
    </>
  );
}
