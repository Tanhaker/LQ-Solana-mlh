"use client";

import { useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useChain } from "@/components/ChainData";
import PassTicket from "@/components/PassTicket";
import { Empty, LoadState, PageHead } from "@/components/ui";
import PriceAdvisor from "@/components/PriceAdvisor";
import Assistant from "@/components/Assistant";
import { cancelListing, faucet, listPass, transferPass } from "@/lib/actions";
import { parseUsdc, usdc } from "@/lib/format";
import { currentPrice, fairValue, type Listing, type Pass, type Plan } from "@/lib/program";

export default function PassesPage() {
  const { plans, passes, listings, now, wallet, balance, sol, mintReady, run, loading, loadError } =
    useChain();

  const planByKey = useMemo(() => new Map(plans.map((p) => [p.address.toBase58(), p])), [plans]);
  const listingByPass = useMemo(
    () => new Map(listings.map((l) => [l.pass.toBase58(), l])),
    [listings],
  );

  const mine = wallet
    ? passes
        .filter((p) => p.owner.equals(wallet))
        .sort((a, b) => b.expiry.toNumber() - a.expiry.toNumber())
    : [];
  const active = mine.filter((p) => p.expiry.toNumber() > now);
  const expired = mine.filter((p) => p.expiry.toNumber() <= now);

  return (
    <>
      <PageHead
        eyebrow="My Passes"
        title="Your passes, your time."
        sub="Holding a pass is the access. Done early? Gift it, or list it and let the price fall until someone buys the days you don't need."
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="panel p-5">
          <div className="label">Test USDC</div>
          <div className="num text-3xl mt-2">{balance ? usdc(balance) : wallet ? "0.00" : "—"}</div>
          <button
            className="btn btn-primary btn-sm mt-4"
            disabled={!wallet}
            onClick={() => run("Get 500 test USDC", (p) => faucet(p, mintReady))}
          >
            Get 500 test USDC
          </button>
        </div>
        <div className="panel p-5">
          <div className="label">Devnet SOL (for fees)</div>
          <div className="num text-3xl mt-2">{sol === null ? "—" : sol.toFixed(3)}</div>
          <a
            className="btn btn-ghost btn-sm mt-4"
            href="https://faucet.solana.com"
            target="_blank"
            rel="noreferrer"
          >
            Get devnet SOL ↗
          </a>
        </div>
        <div className="panel p-5">
          <div className="label">Active passes</div>
          <div className="num text-3xl mt-2">{wallet ? active.length : "—"}</div>
          <p className="text-sm text-muted mt-4">
            {wallet ? "Fees are a fraction of a cent on Solana." : "Connect a wallet to see your passes."}
          </p>
        </div>
      </section>

      <LoadState loading={loading} error={loadError} />

      {active.length > 0 && <Assistant />}

      <section className="mt-10">
        {wallet && active.length === 0 && !loading && (
          <Empty>You don&apos;t hold any active passes. Buy one on the Market.</Empty>
        )}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((pass) => (
            <OwnedPass
              key={pass.address.toBase58()}
              pass={pass}
              plan={planByKey.get(pass.plan.toBase58())}
              listing={listingByPass.get(pass.address.toBase58())}
              now={now}
              run={run}
            />
          ))}
        </div>
      </section>

      {expired.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold mb-4">Expired</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 opacity-70">
            {expired.map((pass) => (
              <PassTicket
                key={pass.address.toBase58()}
                pass={pass}
                plan={planByKey.get(pass.plan.toBase58())}
                now={now}
                owner
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

type RunFn = ReturnType<typeof useChain>["run"];

function OwnedPass({
  pass,
  plan,
  listing,
  now,
  run,
}: {
  pass: Pass;
  plan?: Plan;
  listing?: Listing;
  now: number;
  run: RunFn;
}) {
  const [mode, setMode] = useState<"none" | "gift" | "list">("none");
  const [to, setTo] = useState("");
  const [price, setPrice] = useState("");

  const fair = plan && now ? fairValue(plan, pass, now) : null;
  const parsed = parseUsdc(price);
  const overRetail = parsed && plan ? parsed.gt(plan.price) : false;
  let recipient: PublicKey | null = null;
  try {
    recipient = to.trim() ? new PublicKey(to.trim()) : null;
  } catch {
    recipient = null;
  }

  return (
    <PassTicket
      pass={pass}
      plan={plan}
      now={now}
      owner
      tags={pass.listed ? <span className="chip chip-warn">Listed</span> : undefined}
      price={
        listing ? (
          <>
            <div className="num text-xl">{usdc(currentPrice(listing, pass, now || 0), 3)}</div>
            <div className="label">Asking now</div>
          </>
        ) : fair ? (
          <>
            <div className="num text-xl">{usdc(fair)}</div>
            <div className="label">Time value</div>
          </>
        ) : null
      }
    >
      {pass.listed ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted">Listed. The price falls until it sells.</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => run("Cancel listing", (p) => cancelListing(p, pass))}
          >
            Cancel listing
          </button>
        </div>
      ) : mode === "none" ? (
        <div className="flex gap-2">
          <button className="btn btn-ink btn-sm flex-1" onClick={() => setMode("list")}>
            Sell remaining time
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setMode("gift")}>
            Gift
          </button>
        </div>
      ) : mode === "gift" ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!recipient) return;
            if (await run("Gift pass", (p) => transferPass(p, pass, recipient!))) setMode("none");
          }}
        >
          <label className="label" htmlFor={`to-${pass.address}`}>
            Recipient wallet
          </label>
          <input
            id={`to-${pass.address}`}
            className="field num text-sm"
            placeholder="Solana address"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          {to && !recipient && <span className="text-xs text-warn">Not a valid Solana address.</span>}
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm flex-1" disabled={!recipient}>
              Send pass
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode("none")}>
              Back
            </button>
          </div>
        </form>
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!parsed || parsed.isZero() || overRetail) return;
            if (await run("List pass", (p) => listPass(p, pass, parsed))) setMode("none");
          }}
        >
          <label className="label" htmlFor={`price-${pass.address}`}>
            Starting price (USDC)
          </label>
          <input
            id={`price-${pass.address}`}
            className="field num"
            inputMode="decimal"
            placeholder={fair ? usdc(fair) : "0.00"}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          {overRetail && plan && (
            <span className="text-xs text-warn">
              Can&apos;t be more than the new price ({usdc(plan.price)} USDC).
            </span>
          )}
          {plan && <PriceAdvisor plan={plan} pass={pass} now={now} onPick={(v) => setPrice(v)} />}
          <p className="text-xs text-muted">
            The price falls to zero at expiry. The issuer receives{" "}
            {plan ? plan.royaltyBps / 100 : "—"}% of the sale, you get the rest.
          </p>
          <div className="flex gap-2">
            <button
              className="btn btn-primary btn-sm flex-1"
              disabled={!parsed || parsed.isZero() || overRetail}
            >
              List for sale
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode("none")}>
              Back
            </button>
          </div>
        </form>
      )}
    </PassTicket>
  );
}
