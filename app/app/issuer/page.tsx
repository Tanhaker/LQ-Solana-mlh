"use client";

import { useState } from "react";
import { useChain } from "@/components/ChainData";
import { Empty, PageHead } from "@/components/ui";
import { createPlan, setPlanActive } from "@/lib/actions";
import { parseUsdc, planLength, usdc } from "@/lib/format";

const UNITS = { minutes: 60, hours: 3600, days: 86400 } as const;
type Unit = keyof typeof UNITS;

export default function IssuerPage() {
  const { plans, passes, listings, wallet, run } = useChain();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [length, setLength] = useState("30");
  const [unit, setUnit] = useState<Unit>("days");
  const [royalty, setRoyalty] = useState("10");

  const parsedPrice = parseUsdc(price);
  const lengthNum = Number(length);
  const seconds = Number.isFinite(lengthNum) ? Math.round(lengthNum * UNITS[unit]) : 0;
  const royaltyNum = Number(royalty);
  const errors = [
    !name.trim() || name.length > 32 ? "Name must be 1–32 characters." : null,
    !parsedPrice || parsedPrice.isZero() ? "Enter a price above zero." : null,
    seconds < 60 || seconds > 366 * 86400 ? "Length must be between 1 minute and 366 days." : null,
    !(royaltyNum >= 0 && royaltyNum <= 50) ? "Royalty must be 0–50%." : null,
  ].filter(Boolean) as string[];

  const myPlans = wallet
    ? plans
        .filter((p) => p.issuer.equals(wallet))
        .sort((a, b) => b.createdAt.toNumber() - a.createdAt.toNumber())
    : [];

  return (
    <>
      <PageHead
        eyebrow="Issuer"
        title="Sell access once. Earn on every resale."
        sub="Create a plan and every pass you sell carries your royalty. When a holder resells unused time, your cut is paid in the same transaction, automatically."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr] items-start">
        <form
          className="panel p-6 flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (errors.length || !parsedPrice) return;
            const ok = await run(`Create ${name.trim()}`, (p) =>
              createPlan(p, {
                name: name.trim(),
                price: parsedPrice,
                durationSec: seconds,
                royaltyBps: Math.round(royaltyNum * 100),
              }),
            );
            if (ok) {
              setName("");
              setPrice("");
            }
          }}
        >
          <h2 className="text-xl font-bold">New plan</h2>
          <Field label="Plan name" htmlFor="name">
            <input
              id="name"
              className="field"
              maxLength={32}
              placeholder="AI Writer Pro"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Price (test USDC)" htmlFor="price">
            <input
              id="price"
              className="field num"
              inputMode="decimal"
              placeholder="20.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field label="Length" htmlFor="length">
            <div className="flex gap-2">
              <input
                id="length"
                className="field num"
                inputMode="numeric"
                value={length}
                onChange={(e) => setLength(e.target.value)}
              />
              <select
                aria-label="Length unit"
                className="field w-36"
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
              >
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
            </div>
          </Field>
          <Field label="Resale royalty (%)" htmlFor="royalty">
            <input
              id="royalty"
              className="field num"
              inputMode="decimal"
              value={royalty}
              onChange={(e) => setRoyalty(e.target.value)}
            />
          </Field>
          {(name || price) && errors.length > 0 && (
            <ul className="text-sm text-warn list-disc pl-5">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <button className="btn btn-primary" disabled={!wallet || errors.length > 0}>
            {wallet ? "Create plan" : "Connect a wallet to create a plan"}
          </button>
          <p className="text-xs text-muted">
            Tip for demos: a 10-minute plan lets you watch a pass and its resale price run down live.
          </p>
        </form>

        <section>
          <h2 className="text-xl font-bold mb-4">Your plans</h2>
          {myPlans.length === 0 ? (
            <Empty>{wallet ? "You haven't created a plan yet." : "Connect a wallet to see your plans."}</Empty>
          ) : (
            <div className="flex flex-col gap-4">
              {myPlans.map((plan) => {
                const planPasses = passes.filter((p) => p.plan.equals(plan.address));
                const listed = listings.filter((l) =>
                  planPasses.some((p) => p.address.equals(l.pass)),
                ).length;
                const holders = new Set(planPasses.map((p) => p.owner.toBase58())).size;
                return (
                  <article key={plan.address.toBase58()} className="panel p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold">{plan.name}</h3>
                        <div className="text-sm text-muted mt-1">
                          {usdc(plan.price)} USDC · {planLength(plan.duration.toNumber())} ·{" "}
                          {plan.royaltyBps / 100}% royalty
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`chip ${plan.active ? "chip-live" : ""}`}>
                          {plan.active ? "On sale" : "Paused"}
                        </span>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() =>
                            run(plan.active ? "Pause plan" : "Resume plan", (p) =>
                              setPlanActive(p, plan, !plan.active),
                            )
                          }
                        >
                          {plan.active ? "Pause sales" : "Resume sales"}
                        </button>
                      </div>
                    </div>
                    <dl className="grid grid-cols-3 gap-3 mt-4 text-sm">
                      <Stat label="Passes sold" value={plan.sold.toString()} />
                      <Stat label="Holders now" value={String(holders)} />
                      <Stat label="Listed for resale" value={String(listed)} />
                    </dl>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card-2 border border-line p-3">
      <dt className="label">{label}</dt>
      <dd className="num text-xl mt-1">{value}</dd>
    </div>
  );
}
