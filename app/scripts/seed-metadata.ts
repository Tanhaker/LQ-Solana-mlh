/**
 * Gives the demo plans a logo and description on IPFS.
 *
 *   npx tsx scripts/seed-metadata.ts
 *
 * For each demo plan without metadata: pins its logo (scripts/plan-logos) and
 * a metadata JSON on IPFS through Pinata, then stores the ipfs:// link on
 * chain with set_plan_metadata, signed by that plan's issuer. Plans that
 * already have metadata are skipped, so it is safe to run again.
 *
 * Needs PINATA_JWT in app/.env.local, the deploy wallet at
 * ~/.config/solana/id.json and the demo wallets in scripts/.demo-wallets.json.
 */
import { AnchorProvider, Program, Wallet } from "@anchor-lang/core";
import { Connection, Keypair } from "@solana/web3.js";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import idl from "../lib/idl/liquid_pass.json";
import type { LiquidPass } from "../lib/idl/liquid_pass";
import { setPlanMetadata } from "../lib/actions";
import type { Plan } from "../lib/program";

const DESCRIPTIONS: Record<string, string> = {
  "StreamBox Premium": "Ad-free movies and series in 4K on up to four screens. Binge for a week, resell the rest.",
  "CloudDesk Pro": "A cloud desktop with 16 GB RAM, ready in any browser. For the weeks you need a real workstation.",
  "AI Writer Pro": "Unlimited long-form drafts, rewrites and summaries. Finished your project early? Sell the days you didn't use.",
  "Iron Gym Monthly": "Full access to all Iron Gym floors, classes and saunas, every day from 6 AM to midnight.",
  "Coworking Day Pass": "A hot desk, fast Wi-Fi, coffee and meeting rooms for one day at the downtown hub.",
  "Language Tutor Plus": "Live 1:1 lessons with native tutors in 12 languages, plus unlimited practice chats.",
  "Rust Bootcamp Access": "Two weeks of hands-on Rust: videos, graded exercises and mentor office hours.",
  "Weekend Music Fest": "Three days, four stages, forty artists. Can't make Sunday? Your pass can.",
  "News Pass Annual": "Every article, newsletter and archive issue for a full year, on web and app.",
  "Design Assets Vault": "Unlimited downloads of icons, fonts, mockups and 3D scenes with a commercial licence.",
  "Cloud GPU Hours": "On-demand A100 GPUs for training and inference, billed by the pass, not the minute.",
};

const env = Object.fromEntries(
  (existsSync(join(__dirname, "..", ".env.local")) ? readFileSync(join(__dirname, "..", ".env.local"), "utf8") : "")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]),
);
const JWT = process.env.PINATA_JWT ?? env.PINATA_JWT;
if (!JWT) throw new Error("Set PINATA_JWT in app/.env.local");

const connection = new Connection(process.env.RPC_URL ?? "https://api.devnet.solana.com", "confirmed");
const load = (path: string) => Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, "utf8"))));
const demo: Record<string, number[]> = JSON.parse(readFileSync(join(__dirname, ".demo-wallets.json"), "utf8"));
const issuers = [
  load(join(homedir(), ".config", "solana", "id.json")),
  ...["issuerB", "issuerC", "issuerD"].map((n) => Keypair.fromSecretKey(Uint8Array.from(demo[n]))),
];
const programFor = (k: Keypair): Program<LiquidPass> =>
  new Program(idl as LiquidPass, new AnchorProvider(connection, new Wallet(k), { commitment: "confirmed" }));
const slug = (name: string) => name.toLowerCase().split(/\s+/).join("-");

async function pin(file: Blob, name: string) {
  const body = new FormData();
  body.append("file", file, name);
  body.append("network", "public");
  body.append("name", name);
  const res = await fetch("https://uploads.pinata.cloud/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${JWT}` },
    body,
  });
  const json = (await res.json()) as { data?: { cid?: string } };
  if (!res.ok || !json.data?.cid) throw new Error(`Pinata ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  return json.data.cid;
}

(async () => {
  const reader = programFor(issuers[0]);
  const [plans, metas] = await Promise.all([reader.account.plan.all(), reader.account.planMeta.all()]);
  const hasMeta = new Set(metas.map((m) => m.account.plan.toBase58()));
  for (const { publicKey, account } of plans) {
    const issuer = issuers.find((k) => k.publicKey.equals(account.issuer));
    const description = DESCRIPTIONS[account.name];
    const logoPath = join(__dirname, "plan-logos", `${slug(account.name)}.png`);
    if (!issuer || !description || !existsSync(logoPath)) continue;
    if (hasMeta.has(publicKey.toBase58())) {
      console.log(`skip  ${account.name} (has metadata)`);
      continue;
    }
    const image = await pin(new Blob([readFileSync(logoPath)], { type: "image/png" }), `${slug(account.name)}.png`);
    const meta = { name: account.name, description, image: `ipfs://${image}` };
    const cid = await pin(new Blob([JSON.stringify(meta, null, 2)], { type: "application/json" }), `${slug(account.name)}.json`);
    const plan = { ...account, address: publicKey } as Plan;
    const sig = await setPlanMetadata(programFor(issuer), plan, `ipfs://${cid}`);
    console.log(`set   ${account.name} -> ipfs://${cid}  (${sig.slice(0, 10)}…)`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
