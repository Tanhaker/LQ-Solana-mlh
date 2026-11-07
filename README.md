# Liquid Pass on Solana

**Subscriptions you can resell.** A subscription becomes a time-bound pass that you
own on Solana. Use what you need, then resell the remaining time. A listing's price
falls every second until it reaches zero at expiry, and every resale pays the seller
and the issuer's royalty in one transaction.

Built for the **MLH Solana Hackathon 2026** (6–8 November). Runs on **Solana devnet**
with a test USDC token, so no real money moves.

## The problem

You pay for 30 days, finish your work in 10, and the other 20 days are wasted.
Someone else needs the same tool for a week, but has to buy a full month.
Subscriptions are rows in a company's database: you can't sell what you don't use.

## How it works

| Step | What happens on Solana |
| --- | --- |
| **Issue** | A company creates a `Plan` account: name, price, length, resale royalty. |
| **Buy** | The buyer pays the plan price in USDC to the issuer and gets a `Pass` account with a fixed expiry. |
| **Use** | Access = owning an unexpired pass. Any app can check it by reading the account. |
| **Resell** | The owner creates a `Listing`. Its price falls linearly from the starting price to zero at the pass's expiry, and cannot start above the original price. |
| **Settle** | One `buy_listing` transaction pays the issuer's royalty and the seller's share in USDC, moves the pass to the buyer, and closes the listing. The expiry never changes. |
| **Gift** | The owner can transfer an unlisted pass to any wallet. |

### Why Solana

Resale only works if settling a few days of access costs almost nothing. On Solana a
sale confirms in about a second for a fraction of a cent, the price is computed
on-chain from the cluster clock, and the USDC payouts happen as token CPIs inside the
same instruction, so a sale is all-or-nothing.

## Pass assistant (AI)

On **My Passes** you can type a request in plain English, for example
*"I finished my project, sell my AI Writer pass at a fair price"*. The assistant reads
your passes from the chain (time left, original price, time value, listing state) and
proposes **one** action: list (with a starting price), cancel a listing, or gift. It
explains its choice, and nothing happens until you press **Confirm & sign** in your
wallet.

- Model: Google Gemini (`@ai-sdk/google`), or any model via Vercel AI Gateway.
- The server validates every proposal (the pass must be yours and active, the price
  must be above zero and at most the original price, the recipient must be a valid
  address), and the program enforces the same rules on-chain regardless.
- With no AI key configured it falls back to built-in rules and says so on screen.

## Liquidity AI (site-wide helper)

The liquid logo in the bottom-right corner opens **Liquidity AI**, a chat helper on every
page. Each question is sent with a fresh snapshot of on-chain data (open plans, live
resale prices, and your own passes and balance if a wallet is connected), so it can
answer "what's on resale right now?" or "how much is my pass worth?" from Solana
devnet rather than from memory. It is read-only: it cannot sign or move funds, and it
refuses seed phrases. Code: `app/components/LiquidityAI.tsx`, `app/app/api/chat/route.ts`.
Without an AI key it falls back to keyword answers.

## Program

`programs/liquid_pass/src/lib.rs` (Anchor 1.2.2):

| Instruction | Who | What |
| --- | --- | --- |
| `init_faucet` / `faucet` | anyone | Creates the test-USDC mint (PDA authority) and mints 500 test USDC. Devnet demo money only. |
| `create_plan` | issuer | Name ≤ 32 chars, price > 0, length 1 minute to 366 days, royalty ≤ 50%. |
| `set_plan_active` | issuer | Pause or resume primary sales. |
| `buy_pass` | buyer | Pays the issuer, creates the pass. The issuer can't buy its own plan. |
| `transfer_pass` | owner | Gift. Not while listed or expired. |
| `list_pass` / `cancel_listing` | owner | Starting price ≤ original plan price. |
| `buy_listing(max_price)` | buyer | Price from the clock, `max_price` protects the buyer, royalty to the issuer, rest to the seller. |

Accounts are PDAs: `plan = [b"plan", issuer, plan_id]`, `pass = [b"pass", plan, number]`,
`listing = [b"listing", pass]`, test USDC mint `= [b"usdc"]`.

## Run it

```bash
# program
cargo test -p liquid_pass          # unit tests for the price-decay math
anchor build
anchor deploy --provider.cluster devnet

# app
cd app
npm install
npm run dev
```

Optional `app/.env.local`:

```
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
GOOGLE_GENERATIVE_AI_API_KEY=...   # Gemini for Liquidity AI and the pass assistant
```

Use a wallet such as Phantom in devnet mode, get devnet SOL at
[faucet.solana.com](https://faucet.solana.com), then press **Get 500 test USDC** on My Passes.

## Honest limits

- Devnet only, with a test USDC token the program mints. Not audited.
- A pass is a program account, not an NFT standard, so it shows in this app and on
  Solana Explorer rather than in wallet NFT galleries.
- Real SaaS companies would integrate by checking pass ownership in their sign-in. The
  Verify page shows that check.

## How we built it

This is a new codebase written during the hackathon. The Liquid Pass idea came from an
earlier project our team built on another chain; no code was reused from it. The
Liquid Pass logo and its animated version (used for the Liquidity AI button) are our
team's existing brand assets.

AI tools used: **Claude Code** (Anthropic) assisted with writing code, and **Google
Gemini** powers Liquidity AI and the in-app pass assistant.
