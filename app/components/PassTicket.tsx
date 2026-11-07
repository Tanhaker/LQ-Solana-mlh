"use client";

import { duration, short } from "@/lib/format";
import type { Pass, Plan } from "@/lib/program";

type Props = {
  pass: Pass;
  plan?: Plan;
  now: number;
  /** Price block shown at the top right (e.g. a live resale price). */
  price?: React.ReactNode;
  /** Chips next to the title. */
  tags?: React.ReactNode;
  /** Buttons / forms in the stub below the perforation. */
  children?: React.ReactNode;
  owner?: boolean;
};

export default function PassTicket({ pass, plan, now, price, tags, children, owner }: Props) {
  const expiry = pass.expiry.toNumber();
  const total = plan ? plan.duration.toNumber() : expiry - pass.purchasedAt.toNumber();
  const left = Math.max(0, expiry - now);
  const pct = total > 0 ? Math.min(100, (left / total) * 100) : 0;
  const expired = now > 0 && left === 0;

  return (
    <article className="ticket flex flex-col" data-pass={pass.address.toBase58()}>
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="label">Pass #{pass.number.toNumber() + 1}</div>
            <h3 className="display text-[30px] leading-[0.95] mt-1.5 line-clamp-2 break-words">{plan?.name ?? "Unknown plan"}</h3>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {expired ? (
                <span className="chip">Expired</span>
              ) : (
                <span className="chip chip-live">
                  <span className="pulse" /> Active
                </span>
              )}
              {tags}
            </div>
          </div>
          {price && <div className="text-right shrink-0">{price}</div>}
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-muted">Time left</span>
            <span className="num font-medium">{now ? duration(left) : "—"}</span>
          </div>
          <div className={`meter ${pct < 25 ? "low" : ""}`}>
            <span style={{ width: `${now ? pct : 100}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted mt-1.5 num">
            <span>Expires {new Date(expiry * 1000).toLocaleString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="label">Owner</div>
            <div className="num mt-0.5">{owner ? "You" : short(pass.owner.toBase58())}</div>
          </div>
          <div>
            <div className="label">Issuer</div>
            <div className="num mt-0.5">{short(pass.issuer.toBase58())}</div>
          </div>
        </div>
      </div>
      {children && <div className="ticket-cut p-4 mt-auto">{children}</div>}
    </article>
  );
}
