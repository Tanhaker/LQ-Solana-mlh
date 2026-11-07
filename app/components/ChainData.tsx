"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import type { Program } from "@anchor-lang/core";
import { PublicKey as PublicKeyCtor, type PublicKey } from "@solana/web3.js";
import idl from "@/lib/idl/liquid_pass.json";
import BN from "bn.js";
import type { LiquidPass } from "@/lib/idl/liquid_pass";
import {
  errorMessage,
  readProgram,
  usdcAta,
  usdcMint,
  writeProgram,
  type Listing,
  type Pass,
  type Plan,
} from "@/lib/program";
import { PROGRAM_ID } from "@/lib/config";
import { useToast } from "./Toast";

type ChainData = {
  plans: Plan[];
  passes: Pass[];
  listings: Listing[];
  loading: boolean;
  loadError: string | null;
  /** Seconds since epoch, ticking once a second (0 before mount). */
  now: number;
  mintReady: boolean;
  /** Connected wallet's test-USDC balance in base units, or null if no account yet. */
  balance: BN | null;
  sol: number | null;
  wallet: PublicKey | null;
  /** Re-reads the chain; with `minSlot`, waits until devnet has reached that slot. */
  refresh: (minSlot?: number) => Promise<void>;
  /**
   * Runs a write. `build` receives a wallet-backed program and returns the
   * signature. Shows pending / success / error toasts and refreshes data.
   */
  run: (label: string, build: (p: Program<LiquidPass>) => Promise<string>) => Promise<boolean>;
};

const Ctx = createContext<ChainData | null>(null);

/** First 8 bytes of each account type, from the IDL. */
const DISCRIMINATORS = idl.accounts.map((a) => ({ name: a.name, bytes: a.discriminator }));

export function ChainDataProvider({ children }: { children: React.ReactNode }) {
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const { publicKey, sendTransaction } = useWallet();
  const toast = useToast();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [mintReady, setMintReady] = useState(false);
  const [balance, setBalance] = useState<BN | null>(null);
  const [sol, setSol] = useState<number | null>(null);
  const inflight = useRef(false);

  const reader = useMemo(() => readProgram(connection), [connection]);

  /**
   * Program accounts: first from the cached /api/state snapshot (one devnet
   * read shared by every visitor), falling back to reading devnet directly.
   */
  const loadAccounts = useCallback(async (minSlot?: number) => {
    try {
      const q = new URLSearchParams();
      if (publicKey) q.set("owner", publicKey.toBase58());
      if (minSlot) q.set("minSlot", String(minSlot));
      const res = await fetch(`/api/state${q.size ? `?${q}` : ""}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`state ${res.status}`);
      const snap: {
        slot: number;
        mintReady: boolean;
        accounts: { pubkey: string; data: string }[];
        wallet: { slot: number; usdc: string | null; lamports: number } | null;
      } = await res.json();
      const out = {
        slot: snap.slot as number | null,
        plans: [] as Plan[],
        passes: [] as Pass[],
        listings: [] as Listing[],
        mintReady: snap.mintReady,
        wallet: snap.wallet,
      };
      for (const a of snap.accounts) {
        const data = Buffer.from(a.data, "base64");
        const kind = DISCRIMINATORS.find((d) => d.bytes.every((b, i) => data[i] === b))?.name;
        if (!kind) continue;
        const address = new PublicKeyCtor(a.pubkey);
        // The program client camel-cases IDL names ("Plan" -> "plan").
        const decoded = reader.coder.accounts.decode(kind[0].toLowerCase() + kind.slice(1), data);
        if (kind === "Plan") out.plans.push({ ...decoded, address });
        else if (kind === "Pass") out.passes.push({ ...decoded, address });
        else out.listings.push({ ...decoded, address });
      }
      return out;
    } catch (err) {
      console.warn("Liquid Pass: snapshot unavailable, reading devnet directly", err);
      const [pl, pa, li, mintInfo] = await Promise.all([
        reader.account.plan.all(),
        reader.account.pass.all(),
        reader.account.listing.all(),
        connection.getAccountInfo(usdcMint()),
      ]);
      return {
        slot: null, // read straight from devnet: newest available, slot unknown
        plans: pl.map((p) => ({ ...p.account, address: p.publicKey })),
        passes: pa.map((p) => ({ ...p.account, address: p.publicKey })),
        listings: li.map((p) => ({ ...p.account, address: p.publicKey })),
        mintReady: mintInfo !== null,
        wallet: null,
      };
    }
  }, [reader, connection, publicKey]);

  const hasData = useRef(false);
  /** Slot of the data on screen. Older answers (out-of-order or lagging reads) are ignored. */
  const shownSlot = useRef(0);
  const walletSlot = useRef(0);
  useEffect(() => {
    walletSlot.current = 0; // a different wallet's balances start fresh
  }, [publicKey]);

  /**
   * Routine refreshes (`minSlot` unset) are skipped while one is running.
   * Targeted ones (after a transaction, or a live change notice) always run,
   * and ask devnet for data at least as new as `minSlot`.
   */
  const refresh = useCallback(async (minSlot?: number) => {
    if (!minSlot && inflight.current) return;
    if (!minSlot) inflight.current = true;
    try {
      const snap = await loadAccounts(minSlot);
      if (snap.slot === null || snap.slot >= shownSlot.current) {
        if (snap.slot !== null) shownSlot.current = snap.slot;
        setPlans(snap.plans);
        setPasses(snap.passes);
        setListings(snap.listings);
        setMintReady(snap.mintReady);
      }
      setLoadError(null);
      hasData.current = true;

      if (publicKey && snap.wallet) {
        if (snap.wallet.slot >= walletSlot.current) {
          walletSlot.current = snap.wallet.slot;
          setBalance(snap.wallet.usdc === null ? null : new BN(snap.wallet.usdc));
          setSol(snap.wallet.lamports / 1e9);
        }
      } else if (publicKey) {
        const [bal, lamports] = await Promise.all([
          connection.getTokenAccountBalance(usdcAta(publicKey)).then(
            (r) => new BN(r.value.amount),
            () => null,
          ),
          connection.getBalance(publicKey),
        ]);
        setBalance(bal);
        setSol(lamports / 1e9);
      } else {
        setBalance(null);
        setSol(null);
      }
    } catch (err) {
      // Keep showing the last good data; only surface the error if we have none.
      if (!hasData.current) setLoadError(errorMessage(err));
    } finally {
      if (!minSlot) inflight.current = false;
      setLoading(false);
    }
  }, [loadAccounts, connection, publicKey]);

  useEffect(() => {
    void refresh(1); // runs again when the wallet connects or changes, never skipped
    const id = setInterval(() => void refresh(), 8_000);
    return () => clearInterval(id);
  }, [refresh]);

  /**
   * Live updates: devnet pushes a notice over a websocket whenever any Liquid
   * Pass account changes (anyone's purchase, listing, resale or gift), or the
   * connected wallet's USDC or SOL moves. Each notice triggers one read pinned
   * to that slot, so other people's activity shows up within about a second.
   */
  useEffect(() => {
    let pending = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const changed = (slot: number) => {
      pending = Math.max(pending, slot);
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        const s = pending;
        pending = 0;
        void refresh(s);
      }, 250);
    };
    const subs: number[] = [];
    const walletSubs: number[] = [];
    try {
      subs.push(connection.onProgramAccountChange(PROGRAM_ID, (_a, ctx) => changed(ctx.slot), "confirmed"));
      if (publicKey) {
        walletSubs.push(connection.onAccountChange(publicKey, (_a, ctx) => changed(ctx.slot), "confirmed"));
        walletSubs.push(connection.onAccountChange(usdcAta(publicKey), (_a, ctx) => changed(ctx.slot), "confirmed"));
      }
    } catch (err) {
      console.warn("Liquid Pass: live updates unavailable, polling only", err);
    }
    return () => {
      if (timer) clearTimeout(timer);
      subs.forEach((id) => void connection.removeProgramAccountChangeListener(id).catch(() => {}));
      walletSubs.forEach((id) => void connection.removeAccountChangeListener(id).catch(() => {}));
    };
  }, [connection, publicKey, refresh]);

  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const run = useCallback(
    async (label: string, build: (p: Program<LiquidPass>) => Promise<string>) => {
      if (!anchorWallet) {
        toast.push("error", "Connect a wallet first.");
        return false;
      }
      const id = toast.push("pending", `${label}: confirm in your wallet…`);
      try {
        let slot = 1;
        const sig = await build(writeProgram(connection, anchorWallet, sendTransaction, (s) => (slot = s)));
        toast.update(id, "success", `${label}: confirmed on Solana devnet.`, sig);
        // Read at or after the slot the transaction confirmed in, so it shows at once.
        await refresh(slot);
        return true;
      } catch (err) {
        console.error(err);
        toast.update(id, "error", `${label} failed: ${errorMessage(err)}`);
        return false;
      }
    },
    [anchorWallet, connection, refresh, sendTransaction, toast],
  );

  const value: ChainData = {
    plans,
    passes,
    listings,
    loading,
    loadError,
    now,
    mintReady,
    balance,
    sol,
    wallet: publicKey ?? null,
    refresh,
    run,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChain() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useChain must be used inside ChainDataProvider");
  return ctx;
}
