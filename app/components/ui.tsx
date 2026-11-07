"use client";

export function PageHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="pt-10 sm:pt-14 max-w-3xl">
      <div className="label">{eyebrow}</div>
      <h1 className="text-3xl sm:text-5xl font-bold mt-2 leading-[1.05]">{title}</h1>
      {sub && <p className="text-ink-2 text-lg mt-4 leading-relaxed">{sub}</p>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong p-8 text-center text-muted">
      {children}
    </div>
  );
}

export function LoadState({ loading, error }: { loading: boolean; error: string | null }) {
  if (error)
    return (
      <div className="mt-6 rounded-xl bg-warn-soft text-warn px-4 py-3 text-sm">
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
