/**
 * Fill Solana devnet with demo data so the site looks like a live market.
 *
 *   npx tsx scripts/seed-demo.ts
 *
 * Three issuers (the deploy wallet plus two demo issuers) publish six plans.
 * Four demo holders buy passes, list some of them for resale at different
 * prices, complete one resale and gift one pass. The demo wallets are saved to
 * scripts/.demo-wallets.json (gitignored) so a rerun reuses them. The script
 * also pauses the leftover "E2E Test Plan" from the end-to-end check.
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
import BN from "bn.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import idl from "../lib/idl/liquid_pass.json";
import type { LiquidPass } from "../lib/idl/liquid_pass";
import * as actions from "../lib/actions";
import { currentPrice, listingPda, usdcAta } from "../lib/program";
import type { Plan, Pass, Listing } from "../lib/program";

const RPC = process.env.RPC_URL ?? "https://api.devnet.solana.com";
const connection = new Connection(RPC, "confirmed");
const DAY = 86_400;
const usdc = (n: number) => new BN(Math.round(n * 1_000_000));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const deployer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(join(homedir(), ".config", "solana", "id.json"), "utf8"))),
);

// Demo wallets, reused across runs.
const WALLETS_FILE = join(__dirname, ".demo-wallets.json");
const NAMES = ["issuerB", "issuerC", "maya", "arjun", "lena", "kofi"] as const;
type Name = (typeof NAMES)[number];
const saved: Record<string, number[]> = existsSync(WALLETS_FILE) ? JSON.parse(readFileSync(WALLETS_FILE, "utf8")) : {};
const w = {} as Record<Name, Keypair>;
for (const n of NAMES) w[n] = saved[n] ? Keypair.fromSecretKey(Uint8Array.from(saved[n])) : Keypair.generate();
writeFileSync(WALLETS_FILE, JSON.stringify(Object.fromEntries(NAMES.map((n) => [n, Array.from(w[n].secretKey)])), null, 0));

const programFor = (kp: Keypair): Program<LiquidPass> =>
  new Program(idl as LiquidPass, new AnchorProvider(connection, new Wallet(kp), { commitment: "confirmed" }));

/** Retry a step a few times: the public devnet RPC rate-limits bursts. */
async function step<T>(label: string, fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      const out = await fn();
      console.log(`ok    ${label}`);
      await sleep(400);
      return out;
    } catch (err) {
      if (attempt >= 4) {
        console.log(`FAIL  ${label}: ${String(err).slice(0, 200)}`);
        throw err;
      }
      await sleep(2000 * attempt);
    }
  }
}

const PLANS: { issuer: "deployer" | "issuerB" | "issuerC"; name: string; price: number; days: number; royaltyPct: number }[] = [
  { issuer: "deployer", name: "StreamBox Premium", price: 15, days: 30, royaltyPct: 10 },
  { issuer: "deployer", name: "CloudDesk Pro", price: 25, days: 30, royaltyPct: 5 },
  { issuer: "issuerB", name: "Iron Gym Monthly", price: 40, days: 30, royaltyPct: 8 },
  { issuer: "issuerB", name: "Coworking Day Pass", price: 8, days: 1, royaltyPct: 10 },
  { issuer: "issuerC", name: "Rust Bootcamp Access", price: 60, days: 14, royaltyPct: 15 },
  { issuer: "issuerC", name: "Weekend Music Fest", price: 120, days: 3, royaltyPct: 20 },
];

async function main() {
  const kp = (n: "deployer" | Name) => (n === "deployer" ? deployer : w[n]);
  console.log("deployer", deployer.publicKey.toBase58());
  for (const n of NAMES) console.log(n.padEnd(8), w[n].publicKey.toBase58());

  // 1. Fund demo wallets with a little devnet SOL for fees and rent.
  const needs: PublicKey[] = [];
  for (const n of NAMES) if ((await connection.getBalance(w[n].publicKey)) < 0.03 * LAMPORTS_PER_SOL) needs.push(w[n].publicKey);
  if (needs.length) {
    const tx = new Transaction().add(
      ...needs.map((to) => SystemProgram.transfer({ fromPubkey: deployer.publicKey, toPubkey: to, lamports: 0.06 * LAMPORTS_PER_SOL })),
    );
    await step(`fund ${needs.length} demo wallets`, () => sendAndConfirmTransaction(connection, tx, [deployer]));
  }

  // 2. Test USDC for everyone who buys, and a USDC account for each issuer.
  for (const n of NAMES) {
    const bal = await connection.getTokenAccountBalance(usdcAta(w[n].publicKey)).catch(() => null);
    if (!bal || Number(bal.value.amount) < 300_000_000) await step(`faucet ${n}`, () => actions.faucet(programFor(w[n]), true));
  }

  // 3. Plans (skip ones that already exist for that issuer).
  const all = await programFor(deployer).account.plan.all();
  const plan: Record<string, Plan> = {};
  for (const spec of PLANS) {
    const issuer = kp(spec.issuer);
    const found = all.find((p) => p.account.issuer.equals(issuer.publicKey) && p.account.name === spec.name);
    if (!found) {
      await step(`plan "${spec.name}"`, () =>
        actions.createPlan(programFor(issuer), {
          name: spec.name,
          price: usdc(spec.price),
          durationSec: spec.days * DAY,
          royaltyBps: spec.royaltyPct * 100,
        }),
      );
    }
  }
  const refreshPlans = async () => {
    const list = await programFor(deployer).account.plan.all();
    for (const spec of PLANS) {
      const issuer = kp(spec.issuer);
      const p = list.find((x) => x.account.issuer.equals(issuer.publicKey) && x.account.name === spec.name)!;
      plan[spec.name] = { ...p.account, address: p.publicKey };
    }
  };
  await refreshPlans();

  // Pause the leftover end-to-end test plan.
  const e2e = all.find((p) => p.account.issuer.equals(deployer.publicKey) && p.account.name === "E2E Test Plan" && p.account.active);
  if (e2e) await step(`pause "E2E Test Plan"`, () => actions.setPlanActive(programFor(deployer), { ...e2e.account, address: e2e.publicKey }, false));

  // 4. Holders buy passes (only if they don't already hold one of that plan).
  const BUYS: [Name, string][] = [
    ["maya", "StreamBox Premium"], ["maya", "Iron Gym Monthly"], ["maya", "Weekend Music Fest"],
    ["arjun", "StreamBox Premium"], ["arjun", "CloudDesk Pro"], ["arjun", "Rust Bootcamp Access"],
    ["lena", "Coworking Day Pass"], ["lena", "Iron Gym Monthly"], ["lena", "StreamBox Premium"],
    ["kofi", "Rust Bootcamp Access"], ["kofi", "CloudDesk Pro"],
  ];
  const passes = async () => (await programFor(deployer).account.pass.all()).map((p) => ({ ...p.account, address: p.publicKey }) as Pass);
  let held = await passes();
  const holds = (n: Name, planName: string) =>
    held.find((p) => p.owner.equals(w[n].publicKey) && p.plan.equals(plan[planName].address));
  for (const [n, planName] of BUYS) {
    if (holds(n, planName)) continue;
    await step(`${n} buys ${planName}`, async () => {
      const fresh = await programFor(w[n]).account.plan.fetch(plan[planName].address);
      return actions.buyPass(programFor(w[n]), { ...fresh, address: plan[planName].address });
    });
  }
  held = await passes();

  // 5. Resale listings at different discounts.
  const LISTS: [Name, string, number][] = [
    ["maya", "StreamBox Premium", 12],
    ["maya", "Weekend Music Fest", 105],
    ["arjun", "Rust Bootcamp Access", 48],
    ["lena", "Iron Gym Monthly", 34],
    ["lena", "Coworking Day Pass", 6.5],
    ["arjun", "CloudDesk Pro", 22],
  ];
  for (const [n, planName, price] of LISTS) {
    const pass = holds(n, planName);
    if (!pass || pass.listed) continue;
    await step(`${n} lists ${planName} at ${price} USDC`, () => actions.listPass(programFor(w[n]), pass, usdc(price)));
  }

  // 6. One completed resale: kofi buys arjun's CloudDesk Pro listing... unless kofi
  //    already holds two CloudDesk passes from a previous run.
  held = await passes();
  const cloud = held.find((p) => p.owner.equals(w.arjun.publicKey) && p.plan.equals(plan["CloudDesk Pro"].address) && p.listed);
  if (cloud) {
    await step("kofi buys arjun's CloudDesk Pro on resale", async () => {
      const lst = await programFor(w.kofi).account.listing.fetch(listingPda(cloud.address));
      const listing: Listing = { ...lst, address: listingPda(cloud.address) };
      const quote = currentPrice(lst, cloud, Math.floor(Date.now() / 1000));
      return actions.buyListing(programFor(w.kofi), listing, cloud, plan["CloudDesk Pro"], quote);
    });
  }

  // 7. One gift: lena gives her StreamBox pass to kofi.
  held = await passes();
  const gift = holds("lena", "StreamBox Premium");
  if (gift && !gift.listed) await step("lena gifts StreamBox Premium to kofi", () => actions.transferPass(programFor(w.lena), gift, w.kofi.publicKey));

  // Summary.
  await refreshPlans();
  const listings = await programFor(deployer).account.listing.all();
  console.log("\nPlans:");
  for (const spec of PLANS) console.log(`  ${spec.name.padEnd(22)} sold ${plan[spec.name].sold.toString()}`);
  console.log(`Open resale listings: ${listings.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
