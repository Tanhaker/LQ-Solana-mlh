# Liquid Pass: 2-minute demo script

Voice: confident, warm female (ElevenLabs). About 300 words, 2 minutes.
Each scene is separated by a 1.2-second pause so the video can be cut to the voiceover.

| # | On screen | Voiceover |
| --- | --- | --- |
| 1 | Home hero | Hi, this is Liquid Pass, built for the MLH Solana Hackathon. You pay for thirty days of a subscription, use ten, and the other twenty are wasted. Liquid Pass turns subscriptions into passes you own on Solana, so you can resell the time you don't use. |
| 2 | Pinned Buy / Resell / Settle section | Here's how it works. Buy a pass in USDC, with a fixed expiry. List it, and its price falls every second until it reaches zero at expiry. When someone buys, one transaction pays the seller and the issuer's royalty. |
| 3 | Issuer page, create a plan with a logo | Let's try it on devnet. As an issuer, I create a plan: a price, a length, and a resale royalty. I add a logo and a description. They're pinned on IPFS with Pinata, and the link is saved on Solana with the plan. |
| 4 | Market, buy a pass; My Passes | On the market, a buyer picks a plan and buys a pass. The USDC goes straight to the issuer, and the pass shows up in My Passes, counting down. |
| 5 | Sell remaining time, price falling on Market | Finished early? Sell the remaining time. Liquid Pass suggests a fair price from the time left. Once it's listed, the price drops every second, so unused days find a buyer. |
| 6 | Second buyer buys on resale; Verify | A second buyer picks it up. In about a second, the seller is paid, the issuer gets a royalty, and the pass moves with its original expiry. Any app can check access straight from Solana: granted for the new owner, denied for the old one. |
| 7 | Pass assistant and Liquidity AI | Two AI helpers, powered by Gemini, make it simple. The pass assistant turns plain English into one transaction you confirm, and Liquidity AI answers questions from live chain data. |
| 8 | Back to the hero | Liquid Pass. Subscriptions you can resell, settled on Solana. Your time, unlocked. |

## Text for ElevenLabs (paste as one block)

```
Hi, this is Liquid Pass, built for the MLH Solana Hackathon. You pay for thirty days of a subscription, use ten, and the other twenty are wasted. Liquid Pass turns subscriptions into passes you own on Solana, so you can resell the time you don't use. <break time="1.2s" />
Here's how it works. Buy a pass in USDC, with a fixed expiry. List it, and its price falls every second until it reaches zero at expiry. When someone buys, one transaction pays the seller and the issuer's royalty. <break time="1.2s" />
Let's try it on devnet. As an issuer, I create a plan: a price, a length, and a resale royalty. I add a logo and a description. They're pinned on IPFS with Pinata, and the link is saved on Solana with the plan. <break time="1.2s" />
On the market, a buyer picks a plan and buys a pass. The USDC goes straight to the issuer, and the pass shows up in My Passes, counting down. <break time="1.2s" />
Finished early? Sell the remaining time. Liquid Pass suggests a fair price from the time left. Once it's listed, the price drops every second, so unused days find a buyer. <break time="1.2s" />
A second buyer picks it up. In about a second, the seller is paid, the issuer gets a royalty, and the pass moves with its original expiry. Any app can check access straight from Solana: granted for the new owner, denied for the old one. <break time="1.2s" />
Two AI helpers, powered by Gemini, make it simple. The pass assistant turns plain English into one transaction you confirm, and Liquidity AI answers questions from live chain data. <break time="1.2s" />
Liquid Pass. Subscriptions you can resell, settled on Solana. Your time, unlocked.
```
