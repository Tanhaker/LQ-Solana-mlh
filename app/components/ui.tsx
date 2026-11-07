"use client";

import Split from "./Split";

export function PageHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="pb-4 max-w-[1000px] rise">
      <div className="eyebrow eyebrow-new">{eyebrow}</div>
      <h1 className="display text-[52px] sm:text-[84px] lg:text-[104px] mt-5">
        <Split text={title} delay={150} step={22} />
      </h1>
      {sub && <p data-reveal style={{ ["--d" as string]: "350ms" }} className="text-ink-2 text-[18px] sm:text-[22px] mt-6 leading-[1.4] max-w-[760px]">{sub}</p>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border-[3px] border-dashed border-black bg-[var(--sky)] p-8 text-center text-ink-2 font-bold">
      {children}
    </div>
  );
}

export function LoadState({ loading, error }: { loading: boolean; error: string | null }) {
  if (error)
    return (
      <div className="mt-6 rounded-[18px] border-[3px] border-black bg-[var(--pink)] text-black px-4 py-3 text-sm font-bold">
        Couldn&apos;t read Solana devnet: {error}
      </div>
    );
  if (loading)
    return (
      <div className="mt-6 text-sm text-muted inline-flex items-center gap-2">
        <span className="pulse text-accent" /> Reading passes from Solana devnet…
      </div>
    );
  return null;
}
