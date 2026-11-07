"use client";

import { useEffect, useState } from "react";
import type { PublicKey } from "@solana/web3.js";
import { useChain } from "./ChainData";
import { cidOf, gatewayUrl, type PlanMetadata } from "@/lib/ipfs";

/** Fetched metadata by CID, shared by every card on the page. */
const loaded = new Map<string, PlanMetadata>();
const pending = new Map<string, Promise<PlanMetadata | null>>();

function fetchMeta(cid: string) {
  let p = pending.get(cid);
  if (!p) {
    p = fetch(`/api/meta?cid=${cid}`)
      .then((r) => (r.ok ? (r.json() as Promise<PlanMetadata>) : null))
      .then((m) => {
        if (m) loaded.set(cid, m);
        else pending.delete(cid); // let a later render retry
        return m;
      })
      .catch(() => {
        pending.delete(cid);
        return null;
      });
    pending.set(cid, p);
  }
  return p;
}

export type PlanInfo = PlanMetadata & {
  /** ipfs:// link stored on chain. */
  uri: string;
  /** Gateway address of the metadata JSON, for a "View on IPFS" link. */
  jsonUrl: string | null;
  /** Gateway address of the logo. */
  imageUrl: string | null;
};

/** The plan's IPFS metadata, or null if it has none (or it hasn't loaded yet). */
export function usePlanInfo(plan: PublicKey | undefined | null): PlanInfo | null {
  const { metas } = useChain();
  const uri = plan ? metas.get(plan.toBase58()) : undefined;
  const cid = cidOf(uri);
  const [fetched, setFetched] = useState<{ cid: string; meta: PlanMetadata | null } | null>(null);

  useEffect(() => {
    if (!cid || loaded.has(cid)) return;
    let live = true;
    void fetchMeta(cid).then((m) => {
      if (live) setFetched({ cid, meta: m });
    });
    return () => {
      live = false;
    };
  }, [cid]);

  const meta = cid ? (loaded.get(cid) ?? (fetched?.cid === cid ? fetched.meta : null)) : null;
  if (!uri || !meta) return null;
  return { ...meta, uri, jsonUrl: gatewayUrl(uri), imageUrl: gatewayUrl(meta.image) };
}

const TILE_COLORS = ["var(--yellow)", "var(--lilac)", "var(--green)", "var(--sky)", "var(--pink)", "var(--cream)"];

/** The plan's logo from IPFS, or a colored tile with its initials. */
export function PlanLogo({ name, info, size = 52 }: { name: string; info: PlanInfo | null; size?: number }) {
  const [broken, setBroken] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  const color = TILE_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TILE_COLORS.length];
  const style = { width: size, height: size };

  if (info?.imageUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- IPFS gateway images, already sized
      <img
        src={info.imageUrl}
        alt={`${name} logo`}
        style={style}
        className="shrink-0 rounded-[14px] object-contain"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ ...style, background: color, fontSize: size * 0.4 }}
      className="shrink-0 rounded-[14px] border-[2.5px] border-black grid place-items-center display leading-none"
    >
      {initials}
    </span>
  );
}
