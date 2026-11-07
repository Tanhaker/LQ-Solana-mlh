/**
 * Fill Solana devnet with demo data so the site looks like a live market.
 *
 *   npx tsx scripts/seed-demo.ts [YOUR_WALLET_ADDRESS]
 *
 * - Four issuers (the deploy wallet plus three demo issuers) publish eleven
 *   plans, from a 1-day coworking pass to a 365-day news subscription.
 * - Six demo holders buy passes, list some for resale at different
 *   discounts, complete a resale and gift a pass.
 * - If you pass your own wallet address, it also receives devnet SOL for
 *   fees, 500 test USDC and two passes, so My Passes is ready for a demo.
 *
 * Safe to run again: demo wallets are saved to scripts/.demo-wallets.json
 * (gitignored) and every step checks what already exists before acting.
 */
import { AnchorProvider, Program, Wallet } from "@anchor-lang/core";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, createTransferInstruction } from "@solana/spl-token";
import BN from "bn.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import idl from "../lib/idl/liquid_pass.json";
import type { LiquidPass } from "../lib/idl/liquid_pass";
import * as actions from "../lib/actions";
import { currentPrice, listingPda, passPda, usdcAta, usdcMint } from "../lib/program";
import type { Listing, Pass, Plan } from "../lib/program";

const RPC = process.env.RPC_URL ?? "https://api.devnet.solana.com";
const connection = new Connection(RPC, "confirmed");
const DAY = 86_400;
const usdc = (n: number) => new BN(Math.round(n * 1_000_000));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const deployer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(join(homedir(), ".config", "solana", "id.json"), "utf8"))),
);
const recipient = process.argv[2] ? new PublicKey(process.argv[2]) : null;

// Demo wallets, reused across runs.
const WALLETS_FILE = join(__dirname, ".demo-wallets.json");
const NAMES = ["issuerB", "issuerC", "issuerD", "maya", "arjun", "lena", "kofi", "sofia", "ravi"] as const;
type Name = (typeof NAMES)[number];
type Who = Name | "deployer";
const saved: Record<string, number[]> = existsSync(WALLETS_FILE) ? JSON.parse(readFileSync(WALLETS_FILE, "utf8")) : {};
const w = {} as Record<Name, Keypair>;
for (const n of NAMES) w[n] = saved[n] ? Keypair.fromSecretKey(Uint8Array.from(saved[n])) : Keypair.generate();
writeFileSync(WALLETS_FILE, JSON.stringify(Object.fromEntries(NAMES.map((n) => [n, Array.from(w[n].secretKey)]))));
const kp = (n: Who) => (n === "deployer" ? deployer : w[n]);

const programFor = (k: Keypair): Program<LiquidPass> =>
  new Program(idl as LiquidPass, new AnchorProvider(connection, new Wallet(k), { commitment: "confirmed" }));
const reader = programFor(deployer);

/** Retry a step a few times: the public devnet RPC rate-limits bursts. */
async function step<T>(label: string, fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      const out = await fn();
      console.log(`ok    ${label}`);
      await sleep(350);
      return out;
    } catch (err) {
      if (attempt >= 4) {
        console.log(`FAIL  ${label}: ${String(err).slice(0, 220)}`);
        throw err;
      }
      await sleep(2000 * attempt);
    }
  }
}

// ------------------------------------------------------------------ the data

const PLANS: { issuer: Who; name: string; price: number; days: number; royaltyPct: number }[] = [
  { issuer: "deployer", name: "StreamBox Premium", price: 15, days: 30, royaltyPct: 10 },
  { issuer: "deployer", name: "CloudDesk Pro", price: 25, days: 30, royaltyPct: 5 },
  { issuer: "deployer", name: "AI Writer Pro", price: 30, days: 30, royaltyPct: 10 },
  { issuer: "issuerB", name: "Iron Gym Monthly", price: 40, days: 30, royaltyPct: 8 },
  { issuer: "issuerB", name: "Coworking Day Pass", price: 8, days: 1, royaltyPct: 10 },
  { issuer: "issuerB", name: "Language Tutor Plus", price: 35, days: 90, royaltyPct: 8 },
  { issuer: "issuerC", name: "Rust Bootcamp Access", price: 60, days: 14, royaltyPct: 15 },
  { issuer: "issuerC", name: "Weekend Music Fest", price: 120, days: 3, royaltyPct: 20 },
  { issuer: "issuerC", name: "News Pass Annual", price: 99, days: 365, royaltyPct: 5 },
  { issuer: "issuerD", name: "Design Assets Vault", price: 18, days: 30, royaltyPct: 12 },
  { issuer: "issuerD", name: "Cloud GPU Hours", price: 45, days: 7, royaltyPct: 10 },
];

/** Who holds what. Each pair is bought once. */
const BUYS: [Name, string][] = [
  ["maya", "StreamBox Premium"], ["maya", "Iron Gym Monthly"], ["maya", "Weekend Music Fest"], ["maya", "Design Assets Vault"],
  ["arjun", "StreamBox Premium"], ["arjun", "CloudDesk Pro"], ["arjun", "Rust Bootcamp Access"], ["arjun", "News Pass Annual"],
  ["lena", "Coworking Day Pass"], ["lena", "Iron Gym Monthly"], ["lena", "StreamBox Premium"],
  ["kofi", "Rust Bootcamp Access"], ["kofi", "CloudDesk Pro"], ["kofi", "Cloud GPU Hours"],
  ["sofia", "AI Writer Pro"], ["sofia", "Design Assets Vault"], ["sofia", "News Pass Annual"],
  ["ravi", "AI Writer Pro"], ["ravi", "Cloud GPU Hours"], ["ravi", "Language Tutor Plus"],
];

/**
 * Purchases whose pass later moves to someone else (a resale or a gift).
 * The buy is skipped once the destination already holds `enough` of that plan,
 * so re-running the script doesn't keep buying them again.
 */
const MOVES_TO: Record<string, { to: Name; enough: number }> = {
  "lena|StreamBox Premium": { to: "kofi", enough: 1 },
  "arjun|CloudDesk Pro": { to: "kofi", enough: 2 },
};

/** Resale listings: holder, plan, opening price in USDC (at most the plan price). */
const LISTS: [Name, string, number][] = [
  ["maya", "StreamBox Premium", 12],
  ["maya", "Weekend Music Fest", 105],
  ["maya", "Design Assets Vault", 15],
  ["arjun", "Rust Bootcamp Access", 48],
  ["arjun", "CloudDesk Pro", 22],
  ["lena", "Iron Gym Monthly", 34],
  ["lena", "Coworking Day Pass", 6.5],
  ["sofia", "AI Writer Pro", 24],
  ["sofia", "News Pass Annual", 85],
  ["ravi", "Cloud GPU Hours", 38],
  ["ravi", "Language Tutor Plus", 30],
];

/** Passes handed to your wallet when you pass its address. */
const GIFTS_FOR_YOU = ["AI Writer Pro", "Iron Gym Monthly"];

// ------------------------------------------------------------------ helpers

/** Quiet retry for reads, which the public RPC also rate-limits. */
async function retry<T>(fn: () => Promise<T>, tries = 6): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= tries) throw err;
      await sleep(1500 * i);
    }
  }
}

const plan: Record<string, Plan> = {};
async function loadPlans() {
  const list = await retry(() => reader.account.plan.all());
  for (const spec of PLANS) {
    const p = list.find((x) => x.account.issuer.equals(kp(spec.issuer).publicKey) && x.account.name === spec.name);
    if (p) plan[spec.name] = { ...p.account, address: p.publicKey };
  }
  return list;
}
let held: Pass[] = [];
const loadPasses = async () => {
  held = (await retry(() => reader.account.pass.all())).map((p) => ({ ...p.account, address: p.publicKey }) as Pass);
};
const holds = (owner: PublicKey, planName: string) =>
  held.find((p) => p.owner.equals(owner) && p.plan.equals(plan[planName].address));

const countHeld = (owner: PublicKey, planName: string) =>
  held.filter((p) => p.owner.equals(owner) && p.plan.equals(plan[planName].address)).length;

async function buy(n: Name, planName: string): Promise<Pass> {
  const addr = plan[planName].address;
  const fresh = await retry(() => programFor(w[n]).account.plan.fetch(addr));
  await actions.buyPass(programFor(w[n]), { ...fresh, address: addr });
  const passAddr = passPda(addr, fresh.sold);
  const acc = await retry(() => reader.account.pass.fetch(passAddr));
  return { ...acc, address: passAddr };
}

async function usdcBalance(owner: PublicKey) {
  const r = await retry(() => connection.getAccountInfo(usdcAta(owner))).then((info) =>
    info ? retry(() => connection.getTokenAccountBalance(usdcAta(owner))) : null,
  );
  return r ? Number(r.value.amount) / 1e6 : 0;
}

// ------------------------------------------------------------------ run

async function main() {
  console.log("deployer", deployer.publicKey.toBase58());
  for (const n of NAMES) console.log(n.padEnd(8), w[n].publicKey.toBase58());
  if (recipient) console.log("you     ", recipient.toBase58());

  // 1. Devnet SOL for fees and rent.
  const needs: PublicKey[] = [];
  for (const n of NAMES) if ((await retry(() => connection.getBalance(w[n].publicKey))) < 0.04 * LAMPORTS_PER_SOL) needs.push(w[n].publicKey);
  if (needs.length) {
    const tx = new Transaction().add(
      ...needs.map((to) => SystemProgram.transfer({ fromPubkey: deployer.publicKey, toPubkey: to, lamports: 0.08 * LAMPORTS_PER_SOL })),
    );
    await step(`fund ${needs.length} demo wallets with SOL`, () => sendAndConfirmTransaction(connection, tx, [deployer]));
  }

  // 2. Test USDC for every demo wallet (also creates issuers' USDC accounts).
  for (const n of NAMES) {
    if ((await usdcBalance(w[n].publicKey)) < 300) await step(`faucet ${n}`, () => actions.faucet(programFor(w[n]), true));
  }

  // 3. Plans.
  const all = await loadPlans();
  for (const spec of PLANS) {
    if (plan[spec.name]) continue;
    await step(`plan "${spec.name}"`, () =>
      actions.createPlan(programFor(kp(spec.issuer)), {
        name: spec.name,
        price: usdc(spec.price),
        durationSec: spec.days * DAY,
        royaltyBps: spec.royaltyPct * 100,
      }),
    );
  }
  await loadPlans();

  const e2e = all.find((p) => p.account.issuer.equals(deployer.publicKey) && p.account.name === "E2E Test Plan" && p.account.active);
  if (e2e) await step(`pause "E2E Test Plan"`, () => actions.setPlanActive(reader, { ...e2e.account, address: e2e.publicKey }, false));

  // 4. Purchases.
  await loadPasses();
  for (const [n, planName] of BUYS) {
    if (holds(w[n].publicKey, planName)) continue;
    const move = MOVES_TO[`${n}|${planName}`];
    if (move && countHeld(w[move.to].publicKey, planName) >= move.enough) continue;
    await step(`${n} buys ${planName}`, () => buy(n, planName));
  }
  await loadPasses();

  // 5. Resale listings (only active, unlisted passes).
  const now = Math.floor(Date.now() / 1000);
  for (const [n, planName, price] of LISTS) {
    const pass = holds(w[n].publicKey, planName);
    if (!pass || pass.listed || pass.expiry.toNumber() <= now) continue;
    await step(`${n} lists ${planName} at ${price} USDC`, () => actions.listPass(programFor(w[n]), pass, usdc(price)));
  }

  // 6. One completed resale (kofi buys arjun's CloudDesk Pro) and one gift.
  await loadPasses();
  const cloud = held.find((p) => p.owner.equals(w.arjun.publicKey) && p.plan.equals(plan["CloudDesk Pro"].address) && p.listed);
  if (cloud) {
    await step("kofi buys arjun's CloudDesk Pro on resale", async () => {
      const lst = await reader.account.listing.fetch(listingPda(cloud.address));
      const listing: Listing = { ...lst, address: listingPda(cloud.address) };
      return actions.buyListing(programFor(w.kofi), listing, cloud, plan["CloudDesk Pro"], currentPrice(lst, cloud, Math.floor(Date.now() / 1000)));
    });
  }
  await loadPasses();
  const gift = holds(w.lena.publicKey, "StreamBox Premium");
  if (gift && !gift.listed) await step("lena gifts StreamBox Premium to kofi", () => actions.transferPass(programFor(w.lena), gift, w.kofi.publicKey));

  // 7. Your wallet: SOL for fees, 500 test USDC and two passes.
  if (recipient) {
    if ((await retry(() => connection.getBalance(recipient))) < 0.2 * LAMPORTS_PER_SOL) {
      await step("send you 0.5 devnet SOL", () =>
        sendAndConfirmTransaction(
          connection,
          new Transaction().add(SystemProgram.transfer({ fromPubkey: deployer.publicKey, toPubkey: recipient, lamports: 0.5 * LAMPORTS_PER_SOL })),
          [deployer],
        ),
      );
    }
    if ((await usdcBalance(recipient)) < 100) {
      await step("faucet ravi (for your USDC)", () => actions.faucet(programFor(w.ravi), true));
      await step("send you 500 test USDC", () =>
        sendAndConfirmTransaction(
          connection,
          new Transaction().add(
            createAssociatedTokenAccountIdempotentInstruction(w.ravi.publicKey, usdcAta(recipient), recipient, usdcMint()),
            createTransferInstruction(usdcAta(w.ravi.publicKey), usdcAta(recipient), w.ravi.publicKey, 500_000_000),
          ),
          [w.ravi],
        ),
      );
    }
    await loadPasses();
    for (const planName of GIFTS_FOR_YOU) {
      if (holds(recipient, planName)) continue;
      const fresh = await step(`ravi buys ${planName} for you`, () => buy("ravi", planName));
      await step(`gift ${planName} to you`, () => actions.transferPass(programFor(w.ravi), fresh, recipient));
    }
  }

  // Summary.
  await loadPlans();
  await loadPasses();
  const listings = await retry(() => reader.account.listing.all());
  const live = Math.floor(Date.now() / 1000);
  console.log("\nPlans:");
  for (const spec of PLANS) console.log(`  ${spec.name.padEnd(22)} sold ${plan[spec.name].sold.toString()}`);
  console.log(`Active passes: ${held.filter((p) => p.expiry.toNumber() > live).length}`);
  console.log(`Open resale listings: ${listings.length}`);
  if (recipient) console.log(`Your passes: ${held.filter((p) => p.owner.equals(recipient)).length}, USDC ${await usdcBalance(recipient)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
