"use client";

import { useMemo } from "react";
import { useChain } from "@/components/ChainData";
import PassTicket from "@/components/PassTicket";
import { buyListing, buyPass } from "@/lib/actions";
import { planLength, short, usdc } from "@/lib/format";
import { currentPrice } from "@/lib/program";
import { Empty, LoadState, PageHead } from "@/components/ui";

export default function MarketPage() {
  const { plans, passes, listings, now, wallet, run, loading, loadError } = useChain();

  const planByKey = useMemo(() => new Map(plans.map((p) => [p.address.toBase58(), p])), [plans]);
  const passByKey = useMemo(() => new Map(passes.map((p) => [p.address.toBase58(), p])), [passes]);

  const openPlans = plans
    .filter((p) => p.active)
    .sort((a, b) => b.createdAt.toNumber() - a.createdAt.toNumber());

  const resale = listings
    .map((l) => {
      const pass = passByKey.get(l.pass.toBase58());
      const plan = pass ? planByKey.get(pass.plan.toBase58()) : undefined;
      return pass && plan ? { listing: l, pass, plan } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.pass.expiry.toNumber() > now)
    .sort((a, b) => a.pass.expiry.toNumber() - b.pass.expiry.toNumber());

  return (
    <>
      <PageHead
        eyebrow="Market"
        title="Buy new, or buy what someone didn't use."
        sub="New passes come straight from the issuer. Resale passes keep their original expiry, and their price falls every second until it reaches zero at expiry."
      />
      <LoadState loading={loading} error={loadError} />

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4 mb-4">
          <h2 className="text-[24px] sm:text-[28px] font-semibold">Resale. <span className="soft">Price falling every second.</span></h2>
          <span className="label">{resale.length} listed</span>
        </div>
        {resale.length === 0 ? (
          <Empty>No passes are listed for resale right now. List one from My Passes.</Empty>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {resale.map(({ listing, pass, plan }) => {
              const price = now ? currentPrice(listing, pass, now) : listing.openingPrice;
              const retail = plan.price;
              const saving = retail.isZero() ? 0 : 100 - (price.toNumber() / retail.toNumber()) * 100;
              const mine = wallet?.equals(listing.seller);
              const isIssuer = wallet?.equals(plan.issuer);
              return (
                <PassTicket
                  key={listing.address.toBase58()}
                  pass={pass}
                  plan={plan}
                  now={now}
                  owner={mine}
                  tags={<span className="chip chip-warn">Price falling</span>}
                  price={
                    <>
                      <div className="num text-2xl font-medium">{usdc(price, 3)}</div>
                      <div className="label">USDC now</div>
                      <div className="text-xs text-muted mt-1 num line-through">{usdc(retail)} new</div>
                    </>
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted">
                      {saving > 0 ? `${saving.toFixed(0)}% below new` : "At retail"} · seller{" "}
                      {short(listing.seller.toBase58())}
                    </span>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={!wallet || mine || isIssuer || price.isZero()}
                      title={mine ? "This is your listing" : isIssuer ? "Issuers can't hold their own passes" : ""}
                      onClick={() =>
                        run("Buy resale pass", (p) => buyListing(p, listing, pass, plan, price))
                      }
                    >
                      {mine ? "Your listing" : "Buy"}
                    </button>
                  </div>
                </PassTicket>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-14">
        <div className="flex items-end justify-between gap-4 mb-4">
          <h2 className="text-[24px] sm:text-[28px] font-semibold">New passes. <span className="soft">Straight from the issuer.</span></h2>
          <span className="label">{openPlans.length} plans</span>
        </div>
        {openPlans.length === 0 ? (
          <Empty>No plans yet. Create the first one on the Issuer page.</Empty>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {openPlans.map((plan) => {
              const isIssuer = wallet?.equals(plan.issuer);
              return (
                <article key={plan.address.toBase58()} className="panel p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="label">Plan</div>
                      <h3 className="text-xl font-semibold mt-1 truncate">{plan.name}</h3>
                    </div>
                    <div className="text-right">
                      <div className="num text-2xl font-medium">{usdc(plan.price)}</div>
                      <div className="label">USDC</div>
                    </div>
                  </div>
                  <dl className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt className="label">Length</dt>
                      <dd className="mt-0.5">{planLength(plan.duration.toNumber())}</dd>
                    </div>
                    <div>
                      <dt className="label">Royalty</dt>
                      <dd className="mt-0.5 num">{plan.royaltyBps / 100}%</dd>
                    </div>
                    <div>
                      <dt className="label">Sold</dt>
                      <dd className="mt-0.5 num">{plan.sold.toString()}</dd>
                    </div>
                  </dl>
                  <div className="flex items-center justify-between gap-3 mt-auto pt-2">
                    <span className="text-sm text-muted num">Issuer {short(plan.issuer.toBase58())}</span>
                    <button
                      className="btn btn-ink btn-sm"
                      disabled={!wallet || isIssuer}
                      title={isIssuer ? "You issue this plan" : ""}
                      onClick={() => run(`Buy ${plan.name}`, (p) => buyPass(p, plan))}
                    >
                      {isIssuer ? "Your plan" : "Buy pass"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {!wallet && <p className="text-sm text-muted mt-4">Connect a wallet to buy.</p>}
      </section>
    </>
  );
}
