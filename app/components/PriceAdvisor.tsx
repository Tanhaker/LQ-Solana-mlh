"use client";

import BN from "bn.js";
import { usdc } from "@/lib/format";
import { fairValue, type Pass, type Plan } from "@/lib/program";

/**
 * Suggests a starting price. Because a listing decays linearly to zero at
 * expiry, listing at the pass's time value keeps the asking price equal to the
 * time value for the whole listing.
 */
export default function PriceAdvisor({
  plan,
  pass,
  now,
  onPick,
}: {
  plan: Plan;
  pass: Pass;
  now: number;
  onPick: (value: string) => void;
}) {
  if (!now) return null;
  const fair = fairValue(plan, pass, now);
  if (fair.isZero()) return null;
  const options: { label: string; hint: string; value: BN }[] = [
    { label: "Quick sale", hint: "15% under time value", value: fair.muln(85).divn(100) },
    { label: "Fair", hint: "Matches the time left", value: fair },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          className="chip chip-accent hover:brightness-110 cursor-pointer"
          title={o.hint}
          onClick={() => onPick(usdc(o.value).replace(/,/g, ""))}
        >
          {o.label} · {usdc(o.value)}
        </button>
      ))}
    </div>
  );
}
