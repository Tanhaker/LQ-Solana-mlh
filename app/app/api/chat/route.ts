import { generateText } from "ai";
import { z } from "zod";
import { MODEL, aiEnabled } from "@/lib/ai";

/**
 * Liquidity AI: the site-wide helper. It answers questions about how Liquid
 * Pass works and about what is live on Solana devnet right now, using a
 * snapshot of on-chain data the browser sends with each question. It is
 * read-only: it never signs, never holds keys and never moves funds.
 */

const Msg = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(1200),
});

const Live = z.object({
  page: z.string().max(40),
  walletConnected: z.boolean(),
  usdcBalance: z.number().nullable(),
  solBalance: z.number().nullable(),
  plans: z
    .array(
      z.object({
        name: z.string().max(40),
        priceUsdc: z.number(),
        length: z.string().max(30),
        royaltyPct: z.number(),
        sold: z.number(),
        active: z.boolean(),
      }),
    )
    .max(25),
  listings: z
    .array(
      z.object({
        plan: z.string().max(40),
        priceNowUsdc: z.number(),
        retailUsdc: z.number(),
        timeLeft: z.string().max(30),
      }),
    )
    .max(25),
  myPasses: z
    .array(
      z.object({
        plan: z.string().max(40),
        timeLeft: z.string().max(30),
        listed: z.boolean(),
        expired: z.boolean(),
      }),
    )
    .max(25),
});

const Body = z.object({
  messages: z.array(Msg).min(1).max(16),
  live: Live,
});
type Body = z.infer<typeof Body>;

const SYSTEM = `You are Liquidity AI, the assistant inside Liquid Pass, a Solana app (devnet only, test USDC, no real money).

What Liquid Pass is: subscriptions become time-bound passes the buyer owns on Solana. Use the days you need, resell the rest. The issuer earns a royalty on every resale.

How it works (these rules are enforced by the on-chain Anchor program):
- Issuers create a plan on /issuer: a name (up to 32 characters), a price in USDC, a length (1 minute to 366 days) and a resale royalty (0 to 50%). They can pause or resume a plan.
- Buying a new pass on /market pays the full price to the issuer in USDC and creates a pass account whose expiry is purchase time plus the plan length. An issuer cannot buy their own plan.
- On /passes each pass card has a "Sell" button (list it for resale with an opening price), a "Gift" button (transfer an active, unlisted pass to any wallet except the issuer) and, once listed, "Cancel listing". The /market page has "Buy pass" for new passes and "Buy" for resale passes. Wallets connect with "Select Wallet" at the top right.
- Listing: the opening price can be at most the plan's original price. From then on the asking price falls linearly to zero at the pass's expiry: price now = opening price × (expiry − now) ÷ (expiry − listed at). Listings can be cancelled at any time.
- Buying a resale pass: the buyer pays the current price (with a 2% slippage guard), the royalty (price × royalty %) goes to the issuer and the rest to the seller, and the pass moves to the buyer. All in one transaction, confirmed in about a second for a fraction of a cent.
- Fair value of a pass = original price × time left ÷ plan length. "Quick sale" on /passes suggests about 85% of fair value.
- /verify answers "does this wallet have access?": it checks the wallet owns an unexpired pass, optionally for a specific plan. Any app can do the same by reading Solana directly.
- /passes also has a pass assistant that turns plain English ("sell my pass at a fair price", "gift it to <address>") into one proposed transaction the user signs.
- Getting started: install a Solana wallet such as Phantom, Solflare or Backpack and switch it to devnet; get devnet SOL for fees from faucet.solana.com; then press "Get 500 test USDC" on /passes.

Style:
- Answer in plain text, under 110 words. Short "- " bullet lists are fine. No markdown headings, no bold, no tables.
- Mention pages as /market, /passes, /issuer or /verify so they become links.
- For questions about what is for sale, prices, plans or the user's own passes, use only the LIVE DATA below. If it is empty, say so. Never invent plans, prices or balances.
- You cannot sign transactions, see private keys or move funds. Never ask for a seed phrase or private key; if someone offers one, tell them never to share it.
- If a question has nothing to do with Liquid Pass, Solana or subscriptions, answer in one sentence and steer back.`;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const body = parsed.data;

  if (aiEnabled) {
    try {
      const { text } = await generateText({
        model: MODEL,
        system: `${SYSTEM}\n\nLIVE DATA (read from Solana devnet just now): ${JSON.stringify(body.live)}`,
        messages: body.messages,
        temperature: 0.4,
        providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
      });
      if (text.trim()) return Response.json({ reply: text.trim(), source: "ai" });
    } catch (err) {
      console.error("liquidity ai model call failed", err);
    }
  }
  return Response.json({ reply: rules(body), source: "rules" });
}

/** Keyword answers so the helper still works without an AI key. */
function rules({ messages, live }: Body): string {
  const q = messages[messages.length - 1].content.toLowerCase();
  const has = (...w: string[]) => w.some((x) => q.includes(x));

  if (has("seed", "private key", "secret key", "mnemonic"))
    return "Never share a seed phrase or private key with anyone, including me. Liquid Pass only ever asks your wallet to approve a transaction.";
  if (has("for sale", "listed", "listing", "resale", "cheap", "deal")) {
    if (live.listings.length === 0) return "Nothing is listed for resale right now. New passes are on /market, or list one of yours from /passes.";
    const top = [...live.listings].sort((a, b) => a.priceNowUsdc - b.priceNowUsdc).slice(0, 4);
    return `On resale right now:\n${top.map((l) => `- ${l.plan}: ${l.priceNowUsdc.toFixed(2)} USDC (new ${l.retailUsdc.toFixed(2)}), ${l.timeLeft} left`).join("\n")}\nPrices keep falling every second. Buy on /market.`;
  }
  if (has("plan", "buy", "subscribe", "what can i")) {
    const open = live.plans.filter((p) => p.active);
    if (open.length === 0) return "No plans are open yet. Create the first one on /issuer.";
    return `Plans you can buy on /market:\n${open.slice(0, 4).map((p) => `- ${p.name}: ${p.priceUsdc.toFixed(2)} USDC for ${p.length}, ${p.royaltyPct}% resale royalty`).join("\n")}`;
  }
  if (has("decay", "price fall", "formula", "how is the price", "fair"))
    return "A resale price falls in a straight line from the seller's opening price to zero at the pass's expiry: price now = opening × time left ÷ time left when listed. Fair value is the original price × time left ÷ plan length.";
  if (has("royalt", "issuer earn", "split"))
    return "Each issuer sets a resale royalty up to 50%. When a pass is resold, the royalty goes to the issuer and the rest to the seller, in the same transaction.";
  if (has("faucet", "usdc", "sol", "fund", "balance"))
    return `Get devnet SOL for fees from faucet.solana.com, then press "Get 500 test USDC" on /passes.${live.usdcBalance !== null ? ` Your test USDC balance is ${live.usdcBalance.toFixed(2)}.` : ""}`;
  if (has("sell", "list my", "resell", "gift", "transfer", "send"))
    return "Open /passes. Each active pass has Sell (set an opening price, at most the original) and Gift (send to another wallet). You can also type what you want into the pass assistant there.";
  if (has("verify", "access", "check"))
    return "Use /verify: enter a wallet and, optionally, a plan. Access is granted if that wallet owns an unexpired pass. Any app can check the same thing on Solana.";
  if (has("wallet", "phantom", "connect", "devnet"))
    return "Install Phantom, Solflare or Backpack, switch it to devnet, then use Select Wallet at the top right.";
  if (has("issue", "create", "launch", "company"))
    return "On /issuer, set a name, price, length and resale royalty, then sign once. You keep 100% of every first sale and earn the royalty on every resale.";
  return "I can explain how passes, resale pricing and royalties work, or tell you what's live on /market right now. What would you like to know?";
}
