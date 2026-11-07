import { PublicKey, clusterApiUrl } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ?? "FzUk4dbQE6PQfmMkDMcmZZ6qTPsAStY3e2Pr8aUE54Mz",
);

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl("devnet");

export const CLUSTER = "devnet";

/** Test USDC minted by the program's faucet. 6 decimals, like real USDC. */
export const USDC_DECIMALS = 6;

export const explorerTx = (sig: string) =>
  `https://explorer.solana.com/tx/${sig}?cluster=${CLUSTER}`;

export const explorerAddress = (addr: string) =>
  `https://explorer.solana.com/address/${addr}?cluster=${CLUSTER}`;
