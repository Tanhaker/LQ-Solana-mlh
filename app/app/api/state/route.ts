import { connection as dynamicRequest } from "next/server";
import { Connection } from "@solana/web3.js";
import { PROGRAM_ID, RPC_URL } from "@/lib/config";
import { usdcMint } from "@/lib/program";

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

export async function GET() {
  await dynamicRequest();
  const fresh = cache && Date.now() - cache.at < TTL_MS;
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
  return Response.json(
    { ...cache, stale },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=8, stale-while-revalidate=60" } },
  );
}
