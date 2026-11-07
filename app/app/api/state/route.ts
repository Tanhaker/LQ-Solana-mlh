import { connection as dynamicRequest } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, RPC_URL } from "@/lib/config";
import { usdcAta, usdcMint } from "@/lib/program";

/**
 * One cached snapshot of every Liquid Pass account on devnet.
 *
 * Browsers used to read the chain directly (three getProgramAccounts calls
 * every 15 seconds each), which the public devnet RPC rate-limits. This route
 * makes one call for everyone, caches it for a few seconds here and at the
 * CDN, and keeps serving the last good snapshot if devnet hiccups. The raw
 * account bytes are returned; the browser decodes them with the program's IDL.
 *
 * Every snapshot carries the slot it was read at. After a transaction the
 * browser passes `minSlot` (the slot its transaction confirmed at), and the
 * read is retried until devnet has caught up to it, so the page never shows
 * the state from before the user's own transaction.
 */

type Snapshot = {
  at: number;
  slot: number;
  mintReady: boolean;
  accounts: { pubkey: string; data: string }[];
};

const TTL_MS = 3_000;
let cache: Snapshot | null = null;
let inflight: Promise<Snapshot> | null = null;

const rpc = () => new Connection(RPC_URL, "confirmed");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const behind = (err: unknown) => /minimum context slot|-32016/i.test(String((err as Error)?.message ?? err));

/** Retries while the RPC node answering hasn't reached `minSlot` yet. */
async function atSlot<T>(minSlot: number | undefined, read: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await read();
    } catch (err) {
      if (!minSlot || !behind(err) || i >= 12) throw err;
      await sleep(350);
    }
  }
}

async function load(minSlot?: number): Promise<Snapshot> {
  const c = rpc();
  const [res, mint] = await Promise.all([
    atSlot(minSlot, () =>
      c.getProgramAccounts(PROGRAM_ID, { commitment: "confirmed", withContext: true, minContextSlot: minSlot }),
    ),
    cache?.mintReady ? Promise.resolve(true) : c.getAccountInfo(usdcMint()).then((m) => m !== null),
  ]);
  const snap: Snapshot = {
    at: Date.now(),
    slot: res.context.slot,
    mintReady: mint,
    accounts: res.value.map((a) => ({ pubkey: a.pubkey.toBase58(), data: a.account.data.toString("base64") })),
  };
  // Never replace a newer snapshot with an older one (reads can finish out of order).
  if (!cache || snap.slot >= cache.slot) cache = snap;
  return snap;
}

type WalletBalances = { at: number; slot: number; usdc: string | null; lamports: number };
const wallets = new Map<string, WalletBalances>();

/** The connected wallet's test USDC (base units, null if no account) and SOL. */
async function balances(owner: PublicKey, minSlot?: number): Promise<WalletBalances | null> {
  const key = owner.toBase58();
  const hit = wallets.get(key);
  if (hit && Date.now() - hit.at < TTL_MS && (!minSlot || hit.slot >= minSlot)) return hit;
  try {
    const c = rpc();
    const opts = { commitment: "confirmed" as const, minContextSlot: minSlot };
    const [sol, ata] = await Promise.all([
      atSlot(minSlot, () => c.getBalanceAndContext(owner, opts)),
      atSlot(minSlot, () => c.getAccountInfoAndContext(usdcAta(owner), opts)),
    ]);
    // SPL token account layout: the u64 amount sits at byte offset 64.
    const usdc = ata.value ? ata.value.data.readBigUInt64LE(64).toString() : null;
    const out = { at: Date.now(), slot: Math.min(sol.context.slot, ata.context.slot), usdc, lamports: sol.value };
    if (wallets.size > 500) wallets.clear();
    if (!hit || out.slot >= hit.slot) wallets.set(key, out);
    return out;
  } catch {
    return hit ?? null;
  }
}

export async function GET(req: Request) {
  await dynamicRequest();
  const params = new URL(req.url).searchParams;
  let owner: PublicKey | null = null;
  const raw = params.get("owner");
  if (raw) {
    try {
      owner = new PublicKey(raw);
    } catch {
      return Response.json({ error: "Bad owner address" }, { status: 400 });
    }
  }
  const minSlot = Number(params.get("minSlot")) || undefined;
  const force = params.has("fresh") || minSlot !== undefined;

  let snap: Snapshot | null = cache;
  let stale = false;
  try {
    if (force) {
      // A post-transaction read gets its own devnet call; it must not join a
      // read that started before the transaction landed.
      const reusable = cache && minSlot && cache.slot >= minSlot && Date.now() - cache.at < TTL_MS;
      snap = reusable ? cache : await load(minSlot);
    } else if (!cache || Date.now() - cache.at >= TTL_MS) {
      inflight ??= load().finally(() => {
        inflight = null;
      });
      snap = await inflight;
    }
  } catch (err) {
    if (!cache) {
      return Response.json({ error: `Couldn't read Solana devnet: ${String(err).slice(0, 160)}` }, { status: 503 });
    }
    snap = cache;
    stale = true;
  }
  // The newest snapshot this instance has seen, even if another request just stored a newer one.
  if (cache && snap && cache.slot > snap.slot) snap = cache;

  const wallet = owner ? await balances(owner, minSlot) : null;
  return Response.json(
    { ...snap, stale, wallet },
    {
      headers: {
        // Shared snapshots can sit at the CDN briefly; per-wallet and post-transaction answers must not.
        "Cache-Control": owner || force ? "private, no-store" : "public, max-age=0, s-maxage=2, stale-while-revalidate=4",
      },
    },
  );
}
