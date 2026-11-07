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
 */

type Snapshot = {
  at: number;
  mintReady: boolean;
  accounts: { pubkey: string; data: string }[];
};

const TTL_MS = 8_000;
let cache: Snapshot | null = null;
let inflight: Promise<Snapshot> | null = null;

async function load(): Promise<Snapshot> {
  const rpc = new Connection(RPC_URL, "confirmed");
  const [accounts, mint] = await Promise.all([rpc.getProgramAccounts(PROGRAM_ID), rpc.getAccountInfo(usdcMint())]);
  return {
    at: Date.now(),
    mintReady: mint !== null,
    accounts: accounts.map((a) => ({ pubkey: a.pubkey.toBase58(), data: a.account.data.toString("base64") })),
  };
}

type WalletBalances = { at: number; usdc: string | null; lamports: number };
const wallets = new Map<string, WalletBalances>();

/** The connected wallet's test USDC (base units, null if no account) and SOL. */
async function balances(owner: PublicKey): Promise<WalletBalances | null> {
  const key = owner.toBase58();
  const hit = wallets.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit;
  try {
    const rpc = new Connection(RPC_URL, "confirmed");
    const [lamports, ata] = await Promise.all([rpc.getBalance(owner), rpc.getAccountInfo(usdcAta(owner))]);
    // SPL token account layout: the u64 amount sits at byte offset 64.
    const usdc = ata ? ata.data.readBigUInt64LE(64).toString() : null;
    const out = { at: Date.now(), usdc, lamports };
    if (wallets.size > 500) wallets.clear();
    wallets.set(key, out);
    return out;
  } catch {
    return hit ?? null;
  }
}

export async function GET(req: Request) {
  await dynamicRequest();
  let owner: PublicKey | null = null;
  const raw = new URL(req.url).searchParams.get("owner");
  if (raw) {
    try {
      owner = new PublicKey(raw);
    } catch {
      return Response.json({ error: "Bad owner address" }, { status: 400 });
    }
  }
  // `fresh` is sent right after a transaction so the page shows its result.
  const force = new URL(req.url).searchParams.has("fresh");
  const fresh = !force && cache && Date.now() - cache.at < TTL_MS;
  let stale = false;
  if (!fresh) {
    try {
      inflight ??= load().finally(() => {
        inflight = null;
      });
      cache = await inflight;
    } catch (err) {
      if (!cache) {
        return Response.json({ error: `Couldn't read Solana devnet: ${String(err).slice(0, 160)}` }, { status: 503 });
      }
      stale = true;
    }
  }
  if (force && owner) wallets.delete(owner.toBase58());
  const wallet = owner ? await balances(owner) : null;
  return Response.json(
    { ...cache, stale, wallet },
    {
      headers: {
        // Shared snapshots can sit at the CDN; per-wallet answers must not.
        "Cache-Control":
          owner || force ? "private, no-store" : "public, max-age=0, s-maxage=8, stale-while-revalidate=60",
      },
    },
  );
}
