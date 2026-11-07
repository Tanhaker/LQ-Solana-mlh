import { AnchorProvider, Program, type IdlAccounts } from "@anchor-lang/core";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Transaction, type Signer } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import BN from "bn.js";
import idl from "./idl/liquid_pass.json";
import type { LiquidPass } from "./idl/liquid_pass";
import { PROGRAM_ID } from "./config";

export type PlanData = IdlAccounts<LiquidPass>["plan"];
export type PassData = IdlAccounts<LiquidPass>["pass"];
export type ListingData = IdlAccounts<LiquidPass>["listing"];

export type Plan = PlanData & { address: PublicKey };
export type Pass = PassData & { address: PublicKey };
export type Listing = ListingData & { address: PublicKey };

/** Read-only client: no wallet needed. */
export function readProgram(connection: Connection): Program<LiquidPass> {
  return new Program(idl as LiquidPass, { connection });
}

/** The wallet adapter's sendTransaction (from useWallet). */
export type SendTx = (
  tx: Transaction,
  connection: Connection,
  options?: { signers?: Signer[]; preflightCommitment?: "confirmed" },
) => Promise<string>;

/**
 * Write client. Every `.rpc()` goes through the wallet adapter's
 * `sendTransaction`, which tells the wallet the transaction is for
 * `solana:devnet`. Anchor's default path calls `signTransaction` without a
 * chain, so wallets such as MetaMask simulate it on mainnet, where this
 * program doesn't exist, and refuse to sign.
 */
export function writeProgram(connection: Connection, wallet: AnchorWallet, send: SendTx): Program<LiquidPass> {
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  provider.sendAndConfirm = async (tx, signers) => {
    if (!(tx instanceof Transaction)) throw new Error("Versioned transactions aren't used here.");
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    tx.feePayer = wallet.publicKey;
    tx.recentBlockhash = blockhash;
    // Simulate on devnet first, so a program error shows its real message
    // (Anchor turns these logs into a readable error) instead of a wallet warning.
    const sim = await connection.simulateTransaction(tx);
    if (sim.value.err) {
      throw Object.assign(new Error(`Simulation failed: ${JSON.stringify(sim.value.err)}`), {
        logs: sim.value.logs ?? [],
      });
    }
    const sig = await send(tx, connection, { signers, preflightCommitment: "confirmed" });
    const res = await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
    if (res.value.err) throw new Error(`Transaction failed on devnet: ${JSON.stringify(res.value.err)}`);
    return sig;
  };
  return new Program(idl as LiquidPass, provider);
}

// ------------------------------------------------------------------ PDAs

export const usdcMint = () =>
  PublicKey.findProgramAddressSync([Buffer.from("usdc")], PROGRAM_ID)[0];

export const planPda = (issuer: PublicKey, planId: BN) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("plan"), issuer.toBuffer(), planId.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID,
  )[0];

export const passPda = (plan: PublicKey, number: BN) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("pass"), plan.toBuffer(), number.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID,
  )[0];

export const listingPda = (pass: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from("listing"), pass.toBuffer()], PROGRAM_ID)[0];

export const usdcAta = (owner: PublicKey) =>
  getAssociatedTokenAddressSync(usdcMint(), owner, false, TOKEN_PROGRAM_ID);

// ------------------------------------------------------------------ pricing

/**
 * Mirrors `current_price` in the program: linear decay from the opening price
 * at listing time to zero at the pass's expiry.
 */
export function currentPrice(listing: ListingData, pass: PassData, nowSec: number): BN {
  const expiry = pass.expiry.toNumber();
  const listedAt = listing.listedAt.toNumber();
  if (nowSec >= expiry) return new BN(0);
  const total = expiry - listedAt;
  if (total <= 0) return new BN(0);
  const remaining = expiry - Math.max(nowSec, listedAt);
  return listing.openingPrice.mul(new BN(remaining)).div(new BN(total));
}

/** Time-proportional value of a pass: plan price × time left ÷ plan length. */
export function fairValue(plan: PlanData, pass: PassData, nowSec: number): BN {
  const left = Math.max(0, pass.expiry.toNumber() - nowSec);
  const len = plan.duration.toNumber();
  if (len <= 0) return new BN(0);
  return plan.price.mul(new BN(Math.min(left, len))).div(new BN(len));
}

export const isActive = (pass: PassData, nowSec: number) => pass.expiry.toNumber() > nowSec;

/** Maps an Anchor / wallet error to one readable line. */
export function errorMessage(err: unknown): string {
  const e = err as { error?: { errorMessage?: string }; message?: string; logs?: string[] };
  if (e?.error?.errorMessage) return e.error.errorMessage;
  const msg = e?.message ?? String(err);
  const name = (err as { name?: string })?.name ?? "";
  if (/User rejected/i.test(msg)) return "You rejected the request in your wallet.";
  if (/WalletSendTransactionError/.test(name) && !msg)
    return "Your wallet isn't on Solana Devnet. Switch its network to Devnet (or use Phantom) and try again.";
  if (/insufficient funds/i.test(msg)) return "Not enough test USDC. Use the faucet on My Passes.";
  if (/0x1\b/.test(msg)) return "Not enough funds for this transaction.";
  if (/Attempt to debit an account but found no record of a prior credit/i.test(msg))
    return "Your wallet has no devnet SOL for fees. Get some at faucet.solana.com.";
  return msg.length > 220 ? msg.slice(0, 220) + "…" : msg;
}
