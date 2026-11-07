import type { Program } from "@anchor-lang/core";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";
import BN from "bn.js";
import type { LiquidPass } from "./idl/liquid_pass";
import { listingPda, passPda, planPda, usdcAta, usdcMint, type Listing, type Pass, type Plan } from "./program";

type P = Program<LiquidPass>;

const me = (p: P) => p.provider.publicKey!;

const tokenAccounts = {
  tokenProgram: TOKEN_PROGRAM_ID,
  associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  systemProgram: SystemProgram.programId,
};

/** Mint 500 test USDC to the connected wallet, creating the mint on first use. */
export async function faucet(p: P, mintReady: boolean) {
  const user = me(p);
  const call = p.methods.faucet().accountsPartial({
    user,
    mint: usdcMint(),
    userUsdc: usdcAta(user),
    ...tokenAccounts,
  });
  if (!mintReady) {
    const init = await p.methods
      .initFaucet()
      .accountsPartial({
        payer: user,
        mint: usdcMint(),
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    call.preInstructions([init]);
  }
  return call.rpc();
}

export function createPlan(
  p: P,
  args: { name: string; price: BN; durationSec: number; royaltyBps: number },
) {
  const issuer = me(p);
  // Any unique u64 works; a millisecond timestamp keeps plan addresses distinct per issuer.
  const planId = new BN(Date.now());
  return p.methods
    .createPlan(planId, args.name, args.price, new BN(args.durationSec), args.royaltyBps)
    .accountsPartial({ issuer, plan: planPda(issuer, planId), systemProgram: SystemProgram.programId })
    .rpc();
}

export function setPlanActive(p: P, plan: Plan, active: boolean) {
  return p.methods.setPlanActive(active).accountsPartial({ issuer: me(p), plan: plan.address }).rpc();
}

export function buyPass(p: P, plan: Plan) {
  const buyer = me(p);
  const mint = usdcMint();
  return p.methods
    .buyPass()
    .accountsPartial({
      buyer,
      plan: plan.address,
      pass: passPda(plan.address, plan.sold),
      mint,
      buyerUsdc: usdcAta(buyer),
      issuer: plan.issuer,
      issuerUsdc: usdcAta(plan.issuer),
      ...tokenAccounts,
    })
    .preInstructions([
      createAssociatedTokenAccountIdempotentInstruction(buyer, usdcAta(buyer), buyer, mint),
    ])
    .rpc();
}

export function transferPass(p: P, pass: Pass, to: PublicKey) {
  return p.methods.transferPass(to).accountsPartial({ owner: me(p), pass: pass.address }).rpc();
}

export function listPass(p: P, pass: Pass, openingPrice: BN) {
  return p.methods
    .listPass(openingPrice)
    .accountsPartial({
      owner: me(p),
      pass: pass.address,
      plan: pass.plan,
      listing: listingPda(pass.address),
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export function cancelListing(p: P, pass: Pass) {
  return p.methods
    .cancelListing()
    .accountsPartial({ seller: me(p), pass: pass.address, listing: listingPda(pass.address) })
    .rpc();
}

/**
 * Buy a resale listing. The on-chain price is computed from the chain clock;
 * `maxPrice` is the client's quote plus 2% so a small clock difference cannot
 * fail the sale, while the buyer is never charged more than that.
 */
export function buyListing(p: P, listing: Listing, pass: Pass, plan: Plan, quote: BN) {
  const buyer = me(p);
  const mint = usdcMint();
  const maxPrice = quote.muln(102).divn(100).addn(1);
  return p.methods
    .buyListing(maxPrice)
    .accountsPartial({
      buyer,
      pass: pass.address,
      plan: plan.address,
      listing: listing.address,
      seller: listing.seller,
      mint,
      buyerUsdc: usdcAta(buyer),
      sellerUsdc: usdcAta(listing.seller),
      issuer: plan.issuer,
      issuerUsdc: usdcAta(plan.issuer),
      ...tokenAccounts,
    })
    .preInstructions([
      createAssociatedTokenAccountIdempotentInstruction(buyer, usdcAta(buyer), buyer, mint),
    ])
    .rpc();
}
