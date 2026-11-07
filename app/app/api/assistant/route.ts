import { generateText, Output } from "ai";
import { MODEL, aiEnabled } from "@/lib/ai";
import { z } from "zod";
import { PublicKey } from "@solana/web3.js";

/**
 * Pass assistant: turns a plain-English request about the user's passes into
 * ONE proposed on-chain action. It never signs anything. The browser shows the
 * proposal and the user's wallet signs it, and the program enforces the rules
 * (owner only, price <= original price, not expired) regardless of what the
 * model says.
 */

const PassInfo = z.object({
  address: z.string(),
  plan: z.string(),
  secondsLeft: z.number(),
  planLengthSeconds: z.number(),
  retailUsdc: z.number(),
  fairValueUsdc: z.number(),
  listed: z.boolean(),
  askingNowUsdc: z.number().nullable(),
});

const Body = z.object({
  message: z.string().min(1).max(500),
  passes: z.array(PassInfo).max(50),
  recentResales: z
    .array(z.object({ plan: z.string(), pricePaidUsdc: z.number(), fractionLeft: z.number() }))
    .max(20)
    .default([]),
});

const Proposal = z.object({
  reply: z.string().describe("One or two short sentences to the user, plain English."),
  action: z.enum(["list", "cancel", "gift", "none"]),
  passAddress: z.string().nullable(),
  priceUsdc: z.number().nullable().describe("Starting resale price in USDC, for 'list' only."),
  recipient: z.string().nullable().describe("Solana address, for 'gift' only."),
});
type Proposal = z.infer<typeof Proposal>;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const body = parsed.data;

  let proposal: Proposal;
  let source: "ai" | "rules";
  if (aiEnabled) {
    try {
      proposal = await askModel(body);
      source = "ai";
    } catch (err) {
      console.error("assistant model call failed", err);
      proposal = rules(body);
      source = "rules";
    }
  } else {
    proposal = rules(body);
    source = "rules";
  }

  return Response.json({ ...validate(proposal, body), source });
}

async function askModel(body: z.infer<typeof Body>): Promise<Proposal> {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: Proposal }),
    system: [
      "You help a user manage time-bound subscription passes on Liquid Pass (Solana devnet, test USDC).",
      "Pick at most ONE action: list a pass for resale, cancel a listing, gift a pass, or none.",
      "Rules the program enforces: a listing's price falls linearly to 0 at expiry; the starting price",
      "cannot exceed the pass's retail price; listed passes cannot be gifted; only active passes can be listed.",
      "A pass's fair value is retail × time left ÷ plan length. Listing at fair value keeps the asking",
      "price equal to the remaining time value for the whole listing. For a quick sale suggest about 85% of fair value.",
      "Use recent resales, if any, to justify the price in one short clause.",
      "Only use pass addresses from the list. If the request is ambiguous or impossible, choose 'none' and say why.",
      "Round prices to 2 decimals. Never promise a sale.",
    ].join(" "),
    prompt: JSON.stringify(body),
  });
  return output;
}

/** Deterministic fallback so the feature still works without an AI key. */
function rules(body: z.infer<typeof Body>): Proposal {
  const msg = body.message.toLowerCase();
  const active = body.passes.filter((p) => p.secondsLeft > 0);
  const pick =
    active.find((p) => msg.includes(p.plan.toLowerCase())) ??
    (active.length === 1 ? active[0] : undefined);
  const none = (reply: string): Proposal => ({
    reply,
    action: "none",
    passAddress: null,
    priceUsdc: null,
    recipient: null,
  });

  if (!pick) return none("Which pass do you mean? Mention the plan name.");

  const addr = msg.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/)?.[0];
  if (/(gift|send|give|transfer)/.test(msg) && addr) {
    return { reply: `Gift your ${pick.plan} pass to ${addr.slice(0, 4)}…${addr.slice(-4)}.`, action: "gift", passAddress: pick.address, priceUsdc: null, recipient: addr };
  }
  if (/(cancel|unlist|stop selling|delist)/.test(msg)) {
    return { reply: `Cancel the resale listing for your ${pick.plan} pass.`, action: "cancel", passAddress: pick.address, priceUsdc: null, recipient: null };
  }
  if (/(sell|list|resell)/.test(msg)) {
    // "for 8", "at $8.50", "8 usdc"; plain numbers like "10 days" are ignored.
    const m = msg.match(/(?:\$|\bfor\s+\$?|\bat\s+\$?)(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s*usdc/);
    const explicit = m ? Number(m[1] ?? m[2]) : null;
    const quick = /(quick|fast|asap|soon)/.test(msg);
    const price = explicit ?? (quick ? pick.fairValueUsdc * 0.85 : pick.fairValueUsdc);
    return {
      reply: `List your ${pick.plan} pass at ${price.toFixed(2)} USDC. Its time value is ${pick.fairValueUsdc.toFixed(2)} USDC, and the price will fall to zero at expiry.`,
      action: "list",
      passAddress: pick.address,
      priceUsdc: Math.round(price * 100) / 100,
      recipient: null,
    };
  }
  return none("I can list, cancel a listing, or gift a pass. Try “sell my pass at a fair price”.");
}

/** Server-side checks so a bad model answer can't produce a nonsense proposal. */
function validate(p: Proposal, body: z.infer<typeof Body>): Proposal {
  const reject = (reply: string): Proposal => ({ reply, action: "none", passAddress: null, priceUsdc: null, recipient: null });
  if (p.action === "none") return { ...p, passAddress: null, priceUsdc: null, recipient: null };

  const pass = body.passes.find((x) => x.address === p.passAddress);
  if (!pass) return reject("I couldn't match that to one of your passes.");
  if (pass.secondsLeft <= 0) return reject("That pass has expired.");

  if (p.action === "list") {
    if (pass.listed) return reject("That pass is already listed. Cancel the listing first to change the price.");
    if (p.priceUsdc === null || !(p.priceUsdc > 0)) return reject("I need a price above zero.");
    if (p.priceUsdc > pass.retailUsdc)
      return reject(`The price can't be more than the original ${pass.retailUsdc.toFixed(2)} USDC.`);
    return { ...p, recipient: null };
  }
  if (p.action === "cancel") {
    if (!pass.listed) return reject("That pass isn't listed.");
    return { ...p, priceUsdc: null, recipient: null };
  }
  // gift
  if (pass.listed) return reject("Cancel the listing before gifting the pass.");
  try {
    new PublicKey(p.recipient ?? "");
  } catch {
    return reject("That recipient isn't a valid Solana address.");
  }
  return { ...p, priceUsdc: null };
}
