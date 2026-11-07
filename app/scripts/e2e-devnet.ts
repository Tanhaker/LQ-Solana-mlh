/**
 * End-to-end check against the deployed program on Solana devnet.
 *
 *   npx tsx scripts/e2e-devnet.ts
 *
 * Uses the Anchor deploy wallet (~/.config/solana/id.json) as the ISSUER, and two
 * fresh throwaway keypairs as SELLER and BUYER, funded with a little devnet SOL
 * from the issuer. Asserts balances and ownership after every step.
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
import { getAccount } from "@solana/spl-token";
import BN from "bn.js";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import idl from "../lib/idl/liquid_pass.json";
import type { LiquidPass } from "../lib/idl/liquid_pass";
import * as actions from "../lib/actions";
import { currentPrice, listingPda, passPda, usdcAta, usdcMint } from "../lib/program";
import type { Plan, Pass, Listing } from "../lib/program";

const RPC = process.env.RPC_URL ?? "https://api.devnet.solana.com";
const connection = new Connection(RPC, "confirmed");

const issuer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(join(homedir(), ".config", "solana", "id.json"), "utf8"))),
);
const seller = Keypair.generate();
const buyer = Keypair.generate();

const programFor = (kp: Keypair): Program<LiquidPass> =>
  new Program(idl as LiquidPass, new AnchorProvider(connection, new Wallet(kp), { commitment: "confirmed" }));

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

async function usdcBalance(owner: PublicKey): Promise<bigint> {
  try {
    return (await getAccount(connection, usdcAta(owner))).amount;
  } catch {
    return BigInt(0);
  }
}

async function expectFail(label: string, fn: () => Promise<unknown>, match: RegExp) {
  try {
    await fn();
    check(label, false, "transaction unexpectedly succeeded");
  } catch (err) {
    const msg = String((err as { error?: { errorMessage?: string } })?.error?.errorMessage ?? err);
    check(label, match.test(msg), msg.slice(0, 120));
  }
}

async function main() {
  console.log("issuer", issuer.publicKey.toBase58());
  console.log("seller", seller.publicKey.toBase58());
  console.log("buyer ", buyer.publicKey.toBase58());

  // Fund the two throwaway wallets with fees + rent.
  const fund = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: issuer.publicKey, toPubkey: seller.publicKey, lamports: 0.05 * LAMPORTS_PER_SOL }),
    SystemProgram.transfer({ fromPubkey: issuer.publicKey, toPubkey: buyer.publicKey, lamports: 0.05 * LAMPORTS_PER_SOL }),
  );
  await sendAndConfirmTransaction(connection, fund, [issuer]);

  const pIssuer = programFor(issuer);
  const pSeller = programFor(seller);
  const pBuyer = programFor(buyer);

  // 1. Faucet (creates the mint on first use).
  const mintReady = (await connection.getAccountInfo(usdcMint())) !== null;
  await actions.faucet(pSeller, mintReady);
  await actions.faucet(pBuyer, true);
  check("faucet gives 500 test USDC", (await usdcBalance(seller.publicKey)) === BigInt(500_000_000));

  // 2. Issuer creates a 10-minute plan: 20 USDC, 10% royalty.
  await actions.createPlan(pIssuer, { name: "E2E Test Plan", price: new BN(20_000_000), durationSec: 600, royaltyBps: 1000 });
  const plans = await pIssuer.account.plan.all();
  const planAcc = plans
    .filter((p) => p.account.issuer.equals(issuer.publicKey) && p.account.name === "E2E Test Plan")
    .sort((a, b) => b.account.createdAt.toNumber() - a.account.createdAt.toNumber())[0];
  const plan: Plan = { ...planAcc.account, address: planAcc.publicKey };
  check("plan created", plan.price.eqn(20_000_000) && plan.royaltyBps === 1000);

  // 3. Seller buys a pass. Issuer receives the full price.
  const issuerBefore = await usdcBalance(issuer.publicKey);
  await actions.buyPass(pSeller, plan);
  const passAddr = passPda(plan.address, plan.sold);
  let passAcc = await pSeller.account.pass.fetch(passAddr);
  check("seller owns the new pass", passAcc.owner.equals(seller.publicKey));
  check("issuer paid 20 USDC", (await usdcBalance(issuer.publicKey)) - issuerBefore === BigInt(20_000_000));
  const expiry = passAcc.expiry.toNumber();
  check("expiry is purchase + 600s", expiry - passAcc.purchasedAt.toNumber() === 600);

  // 4. Rules: issuer can't buy own plan; listing above retail rejected.
  await expectFail("issuer cannot buy its own plan", () => actions.buyPass(pIssuer, { ...plan, sold: plan.sold.addn(1) }), /issuer|duplicate|already in use|constraint/i);
  const pass: Pass = { ...passAcc, address: passAddr };
  await expectFail("listing above original price rejected", () => actions.listPass(pSeller, pass, new BN(25_000_000)), /original plan price/i);

  // 5. Seller lists at 15 USDC; it can't be gifted while listed.
  await actions.listPass(pSeller, pass, new BN(15_000_000));
  passAcc = await pSeller.account.pass.fetch(passAddr);
  check("pass marked listed", passAcc.listed);
  await expectFail("listed pass cannot be gifted", () => actions.transferPass(pSeller, pass, buyer.publicKey), /listed/i);

  // 6. Buyer buys the listing. Check the 90/10 split and the price decay.
  const listingAcc = await pBuyer.account.listing.fetch(listingPda(passAddr));
  const listing: Listing = { ...listingAcc, address: listingPda(passAddr) };
  const [sellerBefore, issuerBefore2, buyerBefore] = await Promise.all([
    usdcBalance(seller.publicKey),
    usdcBalance(issuer.publicKey),
    usdcBalance(buyer.publicKey),
  ]);
  const quote = currentPrice(listingAcc, passAcc, Math.floor(Date.now() / 1000));
  const sig = await actions.buyListing(pBuyer, listing, { ...passAcc, address: passAddr }, plan, quote);
  console.log("resale tx", `https://explorer.solana.com/tx/${sig}?cluster=devnet`);

  const paid = buyerBefore - (await usdcBalance(buyer.publicKey));
  const toSeller = (await usdcBalance(seller.publicKey)) - sellerBefore;
  const toIssuer = (await usdcBalance(issuer.publicKey)) - issuerBefore2;
  check("buyer paid less than the 15 USDC opening price (decayed)", paid < BigInt(15_000_000) && paid > BigInt(0), `${Number(paid) / 1e6} USDC`);
  check("issuer got exactly 10% (floor)", toIssuer === (paid * BigInt(1000)) / BigInt(10_000), `${Number(toIssuer) / 1e6}`);
  check("seller got the rest", toSeller === paid - toIssuer, `${Number(toSeller) / 1e6}`);

  passAcc = await pBuyer.account.pass.fetch(passAddr);
  check("buyer now owns the pass", passAcc.owner.equals(buyer.publicKey));
  check("expiry unchanged after resale", passAcc.expiry.toNumber() === expiry);
  check("listing closed", (await connection.getAccountInfo(listingPda(passAddr))) === null);

  // 7. Gift back to the seller.
  await actions.transferPass(pBuyer, { ...passAcc, address: passAddr }, seller.publicKey);
  passAcc = await pBuyer.account.pass.fetch(passAddr);
  check("gift moved the pass", passAcc.owner.equals(seller.publicKey));

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
