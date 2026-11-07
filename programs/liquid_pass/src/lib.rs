//! Liquid Pass: subscriptions as time-bound passes that their owner can resell.
//!
//! An issuer creates a plan (price, duration, royalty). A buyer pays the issuer
//! in test USDC and receives a Pass account with a fixed expiry. The owner can
//! gift the pass or list it; a listing's price falls linearly to zero at expiry,
//! and a sale pays the seller and the issuer's royalty in one transaction while
//! the expiry stays unchanged.

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{self, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked};

declare_id!("FzUk4dbQE6PQfmMkDMcmZZ6qTPsAStY3e2Pr8aUE54Mz");

/// Test USDC uses 6 decimals, like real USDC.
pub const USDC_DECIMALS: u8 = 6;
/// Amount the devnet faucet hands out per request: 500 test USDC.
pub const FAUCET_AMOUNT: u64 = 500 * 1_000_000;
pub const MAX_NAME_LEN: usize = 32;
pub const MAX_ROYALTY_BPS: u16 = 5_000;
pub const MIN_DURATION: i64 = 60;
pub const MAX_DURATION: i64 = 366 * 24 * 60 * 60;
pub const BPS_DENOMINATOR: u64 = 10_000;

pub const USDC_SEED: &[u8] = b"usdc";
pub const PLAN_SEED: &[u8] = b"plan";
pub const PASS_SEED: &[u8] = b"pass";
pub const LISTING_SEED: &[u8] = b"listing";

#[program]
pub mod liquid_pass {
    use super::*;

    /// Creates the program's test-USDC mint. Its mint authority is the mint PDA
    /// itself, so only this program's faucet can mint it.
    pub fn init_faucet(_ctx: Context<InitFaucet>) -> Result<()> {
        Ok(())
    }

    /// Mints FAUCET_AMOUNT of test USDC to the caller. Devnet demo money only.
    pub fn faucet(ctx: Context<Faucet>) -> Result<()> {
        let signer_seeds: &[&[&[u8]]] = &[&[USDC_SEED, &[ctx.bumps.mint]]];
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.user_usdc.to_account_info(),
            authority: ctx.accounts.mint.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.key(), cpi_accounts)
            .with_signer(signer_seeds);
        token_interface::mint_to(cpi_ctx, FAUCET_AMOUNT)
    }

    pub fn create_plan(
        ctx: Context<CreatePlan>,
        plan_id: u64,
        name: String,
        price: u64,
        duration: i64,
        royalty_bps: u16,
    ) -> Result<()> {
        require!(!name.trim().is_empty() && name.len() <= MAX_NAME_LEN, PassError::InvalidName);
        require!(price > 0, PassError::InvalidPrice);
        require!((MIN_DURATION..=MAX_DURATION).contains(&duration), PassError::InvalidDuration);
        require!(royalty_bps <= MAX_ROYALTY_BPS, PassError::InvalidRoyalty);

        let plan = &mut ctx.accounts.plan;
        plan.issuer = ctx.accounts.issuer.key();
        plan.plan_id = plan_id;
        plan.name = name;
        plan.price = price;
        plan.duration = duration;
        plan.royalty_bps = royalty_bps;
        plan.sold = 0;
        plan.active = true;
        plan.created_at = Clock::get()?.unix_timestamp;
        plan.bump = ctx.bumps.plan;
        Ok(())
    }

    /// Issuer can stop or resume primary sales. Existing passes are unaffected.
    pub fn set_plan_active(ctx: Context<SetPlanActive>, active: bool) -> Result<()> {
        ctx.accounts.plan.active = active;
        Ok(())
    }

    /// Primary sale: buyer pays the full plan price to the issuer and receives a
    /// pass that expires `plan.duration` seconds from now.
    pub fn buy_pass(ctx: Context<BuyPass>) -> Result<()> {
        let plan = &ctx.accounts.plan;
        require!(plan.active, PassError::PlanInactive);

        let price = plan.price;
        let duration = plan.duration;
        let number = plan.sold;

        let cpi_accounts = TransferChecked {
            from: ctx.accounts.buyer_usdc.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.issuer_usdc.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.key(), cpi_accounts);
        token_interface::transfer_checked(cpi_ctx, price, USDC_DECIMALS)?;

        let now = Clock::get()?.unix_timestamp;
        let pass = &mut ctx.accounts.pass;
        pass.plan = ctx.accounts.plan.key();
        pass.issuer = ctx.accounts.plan.issuer;
        pass.owner = ctx.accounts.buyer.key();
        pass.number = number;
        pass.purchased_at = now;
        pass.expiry = now.checked_add(duration).ok_or(PassError::MathOverflow)?;
        pass.listed = false;
        pass.bump = ctx.bumps.pass;

        let plan = &mut ctx.accounts.plan;
        plan.sold = plan.sold.checked_add(1).ok_or(PassError::MathOverflow)?;

        emit!(PassPurchased {
            pass: pass.key(),
            plan: pass.plan,
            buyer: pass.owner,
            price,
            expiry: pass.expiry,
        });
        Ok(())
    }

    /// Gift a pass. The expiry does not change.
    pub fn transfer_pass(ctx: Context<TransferPass>, new_owner: Pubkey) -> Result<()> {
        let pass = &mut ctx.accounts.pass;
        require!(!pass.listed, PassError::PassListed);
        require!(Clock::get()?.unix_timestamp < pass.expiry, PassError::PassExpired);
        require!(new_owner != pass.owner, PassError::SameOwner);
        require!(new_owner != pass.issuer, PassError::IssuerCannotHold);
        require!(new_owner != Pubkey::default(), PassError::SameOwner);
        pass.owner = new_owner;
        Ok(())
    }

    /// List a pass for resale. `opening_price` is the price at listing time; it
    /// decays linearly to zero at the pass's expiry. It may not exceed the
    /// original plan price.
    pub fn list_pass(ctx: Context<ListPass>, opening_price: u64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let pass = &mut ctx.accounts.pass;
        require!(!pass.listed, PassError::PassListed);
        require!(now < pass.expiry, PassError::PassExpired);
        require!(opening_price > 0, PassError::InvalidPrice);
        require!(opening_price <= ctx.accounts.plan.price, PassError::AboveRetail);

        pass.listed = true;
        let listing = &mut ctx.accounts.listing;
        listing.pass = pass.key();
        listing.seller = ctx.accounts.owner.key();
        listing.opening_price = opening_price;
        listing.listed_at = now;
        listing.bump = ctx.bumps.listing;
        Ok(())
    }

    pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
        ctx.accounts.pass.listed = false;
        Ok(())
    }

    /// Resale. Price is computed on-chain from the clock; `max_price` protects
    /// the buyer. The royalty goes to the issuer and the rest to the seller, in
    /// this one transaction. Ownership moves to the buyer, expiry unchanged.
    pub fn buy_listing(ctx: Context<BuyListing>, max_price: u64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let pass = &ctx.accounts.pass;
        let listing = &ctx.accounts.listing;
        require!(now < pass.expiry, PassError::PassExpired);

        let price = current_price(listing.opening_price, listing.listed_at, pass.expiry, now)?;
        require!(price > 0, PassError::InvalidPrice);
        require!(price <= max_price, PassError::PriceAboveMax);

        let royalty = (price as u128)
            .checked_mul(ctx.accounts.plan.royalty_bps as u128)
            .ok_or(PassError::MathOverflow)?
            / BPS_DENOMINATOR as u128;
        let royalty = royalty as u64;
        let to_seller = price.checked_sub(royalty).ok_or(PassError::MathOverflow)?;

        let token_program = ctx.accounts.token_program.key();
        if royalty > 0 {
            let cpi_accounts = TransferChecked {
                from: ctx.accounts.buyer_usdc.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.issuer_usdc.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            };
            token_interface::transfer_checked(
                CpiContext::new(token_program, cpi_accounts),
                royalty,
                USDC_DECIMALS,
            )?;
        }
        if to_seller > 0 {
            let cpi_accounts = TransferChecked {
                from: ctx.accounts.buyer_usdc.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.seller_usdc.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            };
            token_interface::transfer_checked(
                CpiContext::new(token_program, cpi_accounts),
                to_seller,
                USDC_DECIMALS,
            )?;
        }

        let pass = &mut ctx.accounts.pass;
        let seller = pass.owner;
        pass.owner = ctx.accounts.buyer.key();
        pass.listed = false;

        emit!(PassResold {
            pass: pass.key(),
            seller,
            buyer: pass.owner,
            price,
            royalty,
            expiry: pass.expiry,
        });
        Ok(())
    }
}

/// Linear decay from `opening_price` at `listed_at` to zero at `expiry`.
pub fn current_price(opening_price: u64, listed_at: i64, expiry: i64, now: i64) -> Result<u64> {
    if now >= expiry {
        return Ok(0);
    }
    let total = expiry.checked_sub(listed_at).ok_or(PassError::MathOverflow)?;
    require!(total > 0, PassError::MathOverflow);
    let remaining = expiry.checked_sub(now.max(listed_at)).ok_or(PassError::MathOverflow)?;
    let price = (opening_price as u128)
        .checked_mul(remaining as u128)
        .ok_or(PassError::MathOverflow)?
        / total as u128;
    Ok(price as u64)
}

// ---------------------------------------------------------------- accounts

#[account]
#[derive(InitSpace)]
pub struct Plan {
    pub issuer: Pubkey,
    pub plan_id: u64,
    #[max_len(32)]
    pub name: String,
    /// Price in test-USDC base units (6 decimals).
    pub price: u64,
    /// Pass length in seconds.
    pub duration: i64,
    pub royalty_bps: u16,
    pub sold: u64,
    pub active: bool,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Pass {
    pub plan: Pubkey,
    pub issuer: Pubkey,
    pub owner: Pubkey,
    /// 0-based pass number within its plan.
    pub number: u64,
    pub purchased_at: i64,
    pub expiry: i64,
    pub listed: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Listing {
    pub pass: Pubkey,
    pub seller: Pubkey,
    pub opening_price: u64,
    pub listed_at: i64,
    pub bump: u8,
}

// ---------------------------------------------------------------- contexts

#[derive(Accounts)]
pub struct InitFaucet<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        mint::decimals = USDC_DECIMALS,
        mint::authority = mint.key(),
        mint::freeze_authority = mint.key(),
        seeds = [USDC_SEED],
        bump
    )]
    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Faucet<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds = [USDC_SEED], bump)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user,
        associated_token::token_program = token_program
    )]
    pub user_usdc: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(plan_id: u64)]
pub struct CreatePlan<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,
    #[account(
        init,
        payer = issuer,
        space = 8 + Plan::INIT_SPACE,
        seeds = [PLAN_SEED, issuer.key().as_ref(), &plan_id.to_le_bytes()],
        bump
    )]
    pub plan: Account<'info, Plan>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetPlanActive<'info> {
    pub issuer: Signer<'info>,
    #[account(mut, has_one = issuer @ PassError::NotIssuer)]
    pub plan: Account<'info, Plan>,
}

#[derive(Accounts)]
pub struct BuyPass<'info> {
    #[account(mut, constraint = buyer.key() != plan.issuer @ PassError::IssuerCannotHold)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    pub plan: Account<'info, Plan>,
    #[account(
        init,
        payer = buyer,
        space = 8 + Pass::INIT_SPACE,
        seeds = [PASS_SEED, plan.key().as_ref(), &plan.sold.to_le_bytes()],
        bump
    )]
    pub pass: Account<'info, Pass>,
    #[account(seeds = [USDC_SEED], bump)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = buyer,
        associated_token::token_program = token_program
    )]
    pub buyer_usdc: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: only used as the authority of `issuer_usdc`; pinned to plan.issuer.
    #[account(address = plan.issuer)]
    pub issuer: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = issuer,
        associated_token::token_program = token_program
    )]
    pub issuer_usdc: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferPass<'info> {
    pub owner: Signer<'info>,
    #[account(mut, has_one = owner @ PassError::NotOwner)]
    pub pass: Account<'info, Pass>,
}

#[derive(Accounts)]
pub struct ListPass<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut, has_one = owner @ PassError::NotOwner, has_one = plan)]
    pub pass: Account<'info, Pass>,
    pub plan: Account<'info, Plan>,
    #[account(
        init,
        payer = owner,
        space = 8 + Listing::INIT_SPACE,
        seeds = [LISTING_SEED, pass.key().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(mut, constraint = pass.owner == seller.key() @ PassError::NotOwner)]
    pub pass: Account<'info, Pass>,
    #[account(
        mut,
        close = seller,
        seeds = [LISTING_SEED, pass.key().as_ref()],
        bump = listing.bump,
        has_one = seller @ PassError::NotOwner,
        has_one = pass
    )]
    pub listing: Account<'info, Listing>,
}

#[derive(Accounts)]
pub struct BuyListing<'info> {
    #[account(
        mut,
        constraint = buyer.key() != seller.key() @ PassError::SameOwner,
        constraint = buyer.key() != plan.issuer @ PassError::IssuerCannotHold
    )]
    pub buyer: Signer<'info>,
    #[account(
        mut,
        has_one = plan,
        constraint = pass.owner == seller.key() @ PassError::NotOwner,
        constraint = pass.listed @ PassError::NotListed
    )]
    pub pass: Account<'info, Pass>,
    pub plan: Account<'info, Plan>,
    #[account(
        mut,
        close = seller,
        seeds = [LISTING_SEED, pass.key().as_ref()],
        bump = listing.bump,
        has_one = seller,
        has_one = pass
    )]
    pub listing: Account<'info, Listing>,
    /// CHECK: receives the sale proceeds' token account authority and the
    /// listing rent; pinned by `listing.seller` and `pass.owner`.
    #[account(mut)]
    pub seller: UncheckedAccount<'info>,
    #[account(seeds = [USDC_SEED], bump)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = buyer,
        associated_token::token_program = token_program
    )]
    pub buyer_usdc: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = seller,
        associated_token::token_program = token_program
    )]
    pub seller_usdc: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: authority of `issuer_usdc`; pinned to plan.issuer.
    #[account(address = plan.issuer)]
    pub issuer: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = issuer,
        associated_token::token_program = token_program
    )]
    pub issuer_usdc: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

// ---------------------------------------------------------------- events

#[event]
pub struct PassPurchased {
    pub pass: Pubkey,
    pub plan: Pubkey,
    pub buyer: Pubkey,
    pub price: u64,
    pub expiry: i64,
}

#[event]
pub struct PassResold {
    pub pass: Pubkey,
    pub seller: Pubkey,
    pub buyer: Pubkey,
    pub price: u64,
    pub royalty: u64,
    pub expiry: i64,
}

// ---------------------------------------------------------------- errors

#[error_code]
pub enum PassError {
    #[msg("Plan name must be 1-32 characters")]
    InvalidName,
    #[msg("Price must be greater than zero")]
    InvalidPrice,
    #[msg("Duration must be between 1 minute and 366 days")]
    InvalidDuration,
    #[msg("Royalty may not exceed 50%")]
    InvalidRoyalty,
    #[msg("This plan is not on sale")]
    PlanInactive,
    #[msg("Only the plan's issuer can do this")]
    NotIssuer,
    #[msg("Only the pass owner can do this")]
    NotOwner,
    #[msg("The pass is listed for sale")]
    PassListed,
    #[msg("The pass is not listed for sale")]
    NotListed,
    #[msg("The pass has expired")]
    PassExpired,
    #[msg("The new owner must be a different wallet")]
    SameOwner,
    #[msg("The issuer cannot hold its own plan's passes")]
    IssuerCannotHold,
    #[msg("Listing price may not exceed the original plan price")]
    AboveRetail,
    #[msg("Current price is above your maximum")]
    PriceAboveMax,
    #[msg("Arithmetic overflow")]
    MathOverflow,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn price_decays_linearly_to_zero() {
        // Listed at t=0 for 1000, expiring at t=100.
        assert_eq!(current_price(1000, 0, 100, 0).unwrap(), 1000);
        assert_eq!(current_price(1000, 0, 100, 25).unwrap(), 750);
        assert_eq!(current_price(1000, 0, 100, 50).unwrap(), 500);
        assert_eq!(current_price(1000, 0, 100, 99).unwrap(), 10);
        assert_eq!(current_price(1000, 0, 100, 100).unwrap(), 0);
        assert_eq!(current_price(1000, 0, 100, 500).unwrap(), 0);
    }

    #[test]
    fn price_never_exceeds_opening() {
        // A clock reading before listed_at must not inflate the price.
        assert_eq!(current_price(1000, 50, 100, 10).unwrap(), 1000);
    }

    #[test]
    fn large_values_do_not_overflow() {
        let p = current_price(u64::MAX, 0, i64::MAX, 1).unwrap();
        assert!(p < u64::MAX);
    }
}
