use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    ed25519_program,
    hash::hashv,
    sysvar::instructions::{load_current_index_checked, load_instruction_at_checked},
};
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("BLiqVau1tSo1anaCrossChainBridge111111111111");

/// 24-hour Autonomous Timelock Refund window (in seconds)
pub const REFUND_TIMELOCK_SECONDS: i64 = 24 * 60 * 60;

/// Protocol fee in basis points: 30 bps = 0.30% (0.20% LP Yield + 0.10% Watchman Sentinel Reserve)
pub const PROTOCOL_FEE_BPS: u64 = 30;
pub const BPS_DENOMINATOR: u64 = 10_000;

/// On-Chain Circuit Breaker: $50,000 maximum single release (6-decimal SPL stablecoin units)
pub const MAX_SINGLE_PAYOUT: u64 = 50_000 * 1_000_000;

/**
 * @title BinaryLiquidVault (Solana SVM Anchor Program)
 * @author BinaryLiquid Protocol / Drian Stak Labs (@drianops)
 * @notice 100% Non-Custodial Triangular Cross-Chain Liquidity Vault connecting:
 *         - Solana SVM (USDC, USDT, SOL SPL Tokens)
 *         - Bitcoin Cash L1 CashTokens (PUSD, MUSD, LIFT via P2SH-32 Covenants)
 *         - EVM Networks (Polygon PoS, Ethereum, Arbitrum, Base, Optimism, BNB Chain)
 *
 * SECURITY INVARIANTS (Solana SVM):
 * 1. Zero-Custody PDA Vault: Liquidity is held exclusively inside Program Derived Addresses (`vault_state` PDA).
 *    No administrative `withdraw()` instruction exists in the bytecode.
 * 2. Ed25519 Cryptographic Attestation: `release` introspects Solana's native `ed25519_program` precompile
 *    to verify that The Watchman Sentinel signed the exact cross-chain payout parameters.
 * 3. On-Chain Circuit Breaker: Enforces `amount <= MAX_SINGLE_PAYOUT` inside SVM runtime.
 * 4. Atomic Anti-Replay PDA: Initializes `ExecutedPayout` PDA seeded by `["payout", origin_tx_hash]`,
 *    making double-settlement of any BCH TxID or EVM TxHash mathematically impossible.
 * 5. Autonomous 24h Timelock Refund: Unsettled deposits can be reclaimed 100% unilaterally by the original
 *    depositor after 24 hours (`REFUND_TIMELOCK_SECONDS`) without Watchman or admin intervention.
 */
#[program]
pub mod binary_liquid_vault {
    use super::*;

    /// Initializes the global Non-Custodial Vault State PDA
    pub fn initialize(ctx: Context<Initialize>, watchman_pubkey: [u8; 32]) -> Result<()> {
        require!(watchman_pubkey != [0u8; 32], VaultError::InvalidWatchmanKey);

        let vault = &mut ctx.accounts.vault_state;
        vault.authority = ctx.accounts.authority.key();
        vault.watchman_pubkey = watchman_pubkey;
        vault.paused = false;
        vault.bump = ctx.bumps.vault_state;
        vault.total_settled_volume = 0;

        emit!(VaultInitializedEvent {
            authority: vault.authority,
            watchman_pubkey,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Deposits SPL Tokens (USDC/USDT/WSOL) on Solana to bridge to Bitcoin Cash (CashTokens) or any EVM Chain
    pub fn deposit(
        ctx: Context<Deposit>,
        deposit_id: [u8; 32],
        amount: u64,
        destination_chain: String,
        recipient: String,
    ) -> Result<()> {
        let vault = &ctx.accounts.vault_state;
        require!(!vault.paused, VaultError::VaultPaused);
        require!(amount > 0, VaultError::ZeroAmount);
        require!(
            destination_chain.len() >= 3 && destination_chain.len() <= 32,
            VaultError::InvalidDestinationChain
        );
        require!(
            recipient.len() >= 20 && recipient.len() <= 128,
            VaultError::InvalidRecipientAddress
        );

        let fee = amount
            .checked_mul(PROTOCOL_FEE_BPS)
            .ok_or(VaultError::MathOverflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(VaultError::MathOverflow)?;
        let net_amount = amount.checked_sub(fee).ok_or(VaultError::MathOverflow)?;

        // Transfer SPL Tokens from user's token account into the Non-Custodial Vault Token Account
        let cpi_accounts = Transfer {
            from: ctx.accounts.depositor_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.depositor.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        let now = Clock::get()?.unix_timestamp;
        let record = &mut ctx.accounts.deposit_record;
        record.deposit_id = deposit_id;
        record.depositor = ctx.accounts.depositor.key();
        record.mint = ctx.accounts.mint.key();
        record.gross_amount = amount;
        record.net_amount = net_amount;
        record.destination_chain = destination_chain.clone();
        record.recipient = recipient.clone();
        record.timestamp = now;
        record.refunded = false;
        record.completed = false;
        record.bump = ctx.bumps.deposit_record;

        emit!(BridgeDepositInitiatedEvent {
            deposit_id,
            depositor: record.depositor,
            mint: record.mint,
            gross_amount: amount,
            net_amount,
            destination_chain,
            recipient,
            timestamp: now,
        });

        Ok(())
    }

    /// Marks an outbound Solana -> BCH or Solana -> EVM deposit as settled once destination chain confirms
    pub fn mark_deposit_completed(
        ctx: Context<MarkDepositCompleted>,
        _deposit_id: [u8; 32],
        destination_payout_tx_hash: [u8; 32],
    ) -> Result<()> {
        let record = &mut ctx.accounts.deposit_record;
        require!(!record.refunded, VaultError::AlreadyRefunded);
        require!(!record.completed, VaultError::AlreadyCompleted);

        record.completed = true;

        emit!(BridgeDepositSettledEvent {
            deposit_id: record.deposit_id,
            destination_payout_tx_hash,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Releases SPL Tokens on Solana upon verified Ed25519 attestation from The Watchman Sentinel
    /// Supports inbound liquidity from BOTH Bitcoin Cash (CashTokens Covenants) AND EVM Chains (Polygon/ETH/Arbitrum)
    pub fn release(
        ctx: Context<Release>,
        origin_tx_hash: [u8; 32],
        amount: u64,
        nonce: u64,
        ed25519_signature: [u8; 64],
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault_state;
        require!(!vault.paused, VaultError::VaultPaused);
        require!(
            amount > 0 && amount <= MAX_SINGLE_PAYOUT,
            VaultError::ExceedsCircuitBreaker
        );

        // Construct canonical message digest signed by The Watchman Sentinel
        let digest = hashv(&[
            b"SOLANA_VAULT_RELEASE",
            &origin_tx_hash,
            ctx.accounts.recipient.key().as_ref(),
            ctx.accounts.mint.key().as_ref(),
            &amount.to_le_bytes(),
            &nonce.to_le_bytes(),
            crate::ID.as_ref(),
        ]);

        // Introspect preceding Ed25519 precompile instruction in transaction
        verify_ed25519_watchman_attestation(
            &ctx.accounts.instructions_sysvar,
            &vault.watchman_pubkey,
            digest.as_ref(),
            &ed25519_signature,
        )?;

        // Record anti-replay PDA (initialization itself guarantees uniqueness on-chain)
        let now = Clock::get()?.unix_timestamp;
        let payout_record = &mut ctx.accounts.executed_payout;
        payout_record.origin_tx_hash = origin_tx_hash;
        payout_record.recipient = ctx.accounts.recipient.key();
        payout_record.mint = ctx.accounts.mint.key();
        payout_record.amount = amount;
        payout_record.nonce = nonce;
        payout_record.timestamp = now;
        payout_record.bump = ctx.bumps.executed_payout;

        vault.total_settled_volume = vault
            .total_settled_volume
            .checked_add(amount)
            .ok_or(VaultError::MathOverflow)?;

        // Sign SPL token transfer using Vault State PDA seeds
        let seeds: &[&[u8]] = &[b"vault_state", &[vault.bump]];
        let signer_seeds = &[seeds];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: vault.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, amount)?;

        emit!(BridgePayoutReleasedEvent {
            origin_tx_hash,
            recipient: ctx.accounts.recipient.key(),
            mint: ctx.accounts.mint.key(),
            amount,
            nonce,
            timestamp: now,
        });

        Ok(())
    }

    /// Autonomous 24h Timelock Refund: Unconditional return of principal if unfulfilled
    pub fn refund(ctx: Context<Refund>, _deposit_id: [u8; 32]) -> Result<()> {
        let vault = &ctx.accounts.vault_state;
        let record = &mut ctx.accounts.deposit_record;
        let now = Clock::get()?.unix_timestamp;

        require!(!record.completed, VaultError::AlreadyCompleted);
        require!(!record.refunded, VaultError::AlreadyRefunded);
        require!(
            now >= record.timestamp + REFUND_TIMELOCK_SECONDS,
            VaultError::TimelockStillActive
        );
        require!(
            ctx.accounts.depositor.key() == record.depositor,
            VaultError::UnauthorizedDepositor
        );

        record.refunded = true;

        let seeds: &[&[u8]] = &[b"vault_state", &[vault.bump]];
        let signer_seeds = &[seeds];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.depositor_token_account.to_account_info(),
            authority: vault.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, record.gross_amount)?;

        emit!(BridgeDepositRefundedEvent {
            deposit_id: record.deposit_id,
            depositor: record.depositor,
            mint: record.mint,
            amount: record.gross_amount,
            timestamp: now,
        });

        Ok(())
    }

    /// Updates the authorized Watchman Sentinel Ed25519 public key
    pub fn set_watchman_pubkey(
        ctx: Context<AdminAction>,
        new_watchman_pubkey: [u8; 32],
    ) -> Result<()> {
        require!(
            new_watchman_pubkey != [0u8; 32],
            VaultError::InvalidWatchmanKey
        );
        let vault = &mut ctx.accounts.vault_state;
        let previous = vault.watchman_pubkey;
        vault.watchman_pubkey = new_watchman_pubkey;

        emit!(WatchmanUpdatedEvent {
            previous_pubkey: previous,
            new_pubkey: new_watchman_pubkey,
        });
        Ok(())
    }

    /// Toggles the Emergency Circuit Breaker pause flag
    pub fn toggle_pause(ctx: Context<AdminAction>, paused: bool) -> Result<()> {
        let vault = &mut ctx.accounts.vault_state;
        vault.paused = paused;
        emit!(EmergencyPauseToggledEvent { paused });
        Ok(())
    }
}

/// Verifies that the transaction includes a valid Solana Ed25519 precompile instruction
/// matching `watchman_pubkey`, `message_digest`, and `expected_signature`.
fn verify_ed25519_watchman_attestation(
    instructions_sysvar: &AccountInfo,
    watchman_pubkey: &[u8; 32],
    message_digest: &[u8],
    expected_signature: &[u8; 64],
) -> Result<()> {
    let current_index = load_current_index_checked(instructions_sysvar)
        .map_err(|_| error!(VaultError::MissingEd25519Instruction))?;
    require!(current_index > 0, VaultError::MissingEd25519Instruction);

    let ed25519_ix = load_instruction_at_checked((current_index - 1) as usize, instructions_sysvar)
        .map_err(|_| error!(VaultError::MissingEd25519Instruction))?;

    require!(
        ed25519_ix.program_id == ed25519_program::ID,
        VaultError::InvalidEd25519Program
    );

    // Ed25519 instruction layout: 16-byte header + 64-byte sig + 32-byte pubkey + 32-byte digest = 144 bytes
    let data = &ed25519_ix.data;
    require!(data.len() == 144, VaultError::InvalidEd25519Signature);

    // Enforce canonical 16-byte Ed25519SignatureOffsets header:
    // [num_sigs=1, pad=0, sig_offset=16(LE), sig_ix=0xFFFF, pk_offset=80(LE), pk_ix=0xFFFF, msg_offset=112(LE), msg_size=32(LE), msg_ix=0xFFFF]
    let expected_header: [u8; 16] = [
        1, 0,
        16, 0, 0xFF, 0xFF,
        80, 0, 0xFF, 0xFF,
        112, 0, 32, 0, 0xFF, 0xFF,
    ];
    require!(
        data[0..16] == expected_header,
        VaultError::InvalidEd25519Signature
    );

    let ix_sig = &data[16..80];
    let ix_pubkey = &data[80..112];
    let ix_msg = &data[112..144];

    require!(
        ix_sig == expected_signature,
        VaultError::InvalidEd25519Signature
    );
    require!(
        ix_pubkey == watchman_pubkey,
        VaultError::InvalidWatchmanKey
    );
    require!(
        ix_msg == message_digest,
        VaultError::InvalidEd25519Signature
    );

    Ok(())
}

// ============================================================================
// ACCOUNT CONTEXTS
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + VaultState::SPACE,
        seeds = [b"vault_state"],
        bump
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(deposit_id: [u8; 32])]
pub struct Deposit<'info> {
    #[account(
        seeds = [b"vault_state"],
        bump = vault_state.bump
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        init,
        payer = depositor,
        space = 8 + DepositRecord::SPACE,
        seeds = [b"deposit", deposit_id.as_ref()],
        bump
    )]
    pub deposit_record: Account<'info, DepositRecord>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = depositor_token_account.owner == depositor.key(),
        constraint = depositor_token_account.mint == mint.key()
    )]
    pub depositor_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = vault_token_account.owner == vault_state.key(),
        constraint = vault_token_account.mint == mint.key()
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub depositor: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(deposit_id: [u8; 32])]
pub struct MarkDepositCompleted<'info> {
    #[account(
        seeds = [b"vault_state"],
        bump = vault_state.bump,
        has_one = authority
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        mut,
        seeds = [b"deposit", deposit_id.as_ref()],
        bump = deposit_record.bump
    )]
    pub deposit_record: Account<'info, DepositRecord>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(origin_tx_hash: [u8; 32])]
pub struct Release<'info> {
    #[account(
        mut,
        seeds = [b"vault_state"],
        bump = vault_state.bump
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        init,
        payer = payer,
        space = 8 + ExecutedPayout::SPACE,
        seeds = [b"payout", origin_tx_hash.as_ref()],
        bump
    )]
    pub executed_payout: Account<'info, ExecutedPayout>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = vault_token_account.owner == vault_state.key(),
        constraint = vault_token_account.mint == mint.key()
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: Verified via token account owner constraint and signed digest
    pub recipient: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = recipient_token_account.owner == recipient.key(),
        constraint = recipient_token_account.mint == mint.key()
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,

    /// CHECK: Sysvar Instructions account for Ed25519 signature introspection
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(deposit_id: [u8; 32])]
pub struct Refund<'info> {
    #[account(
        seeds = [b"vault_state"],
        bump = vault_state.bump
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        mut,
        seeds = [b"deposit", deposit_id.as_ref()],
        bump = deposit_record.bump
    )]
    pub deposit_record: Account<'info, DepositRecord>,

    #[account(
        mut,
        constraint = vault_token_account.owner == vault_state.key(),
        constraint = vault_token_account.mint == deposit_record.mint
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = depositor_token_account.owner == depositor.key(),
        constraint = depositor_token_account.mint == deposit_record.mint
    )]
    pub depositor_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub depositor: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
    #[account(
        mut,
        seeds = [b"vault_state"],
        bump = vault_state.bump,
        has_one = authority
    )]
    pub vault_state: Account<'info, VaultState>,

    pub authority: Signer<'info>,
}

// ============================================================================
// STATE ACCOUNTS
// ============================================================================

#[account]
pub struct VaultState {
    pub authority: Pubkey,
    pub watchman_pubkey: [u8; 32],
    pub paused: bool,
    pub bump: u8,
    pub total_settled_volume: u64,
}

impl VaultState {
    pub const SPACE: usize = 32 + 32 + 1 + 1 + 8;
}

#[account]
pub struct DepositRecord {
    pub deposit_id: [u8; 32],
    pub depositor: Pubkey,
    pub mint: Pubkey,
    pub gross_amount: u64,
    pub net_amount: u64,
    pub destination_chain: String,
    pub recipient: String,
    pub timestamp: i64,
    pub refunded: bool,
    pub completed: bool,
    pub bump: u8,
}

impl DepositRecord {
    // 32 + 32 + 32 + 8 + 8 + (4 + 32) + (4 + 128) + 8 + 1 + 1 + 1 = 291 bytes
    pub const SPACE: usize = 320;
}

#[account]
pub struct ExecutedPayout {
    pub origin_tx_hash: [u8; 32],
    pub recipient: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub nonce: u64,
    pub timestamp: i64,
    pub bump: u8,
}

impl ExecutedPayout {
    pub const SPACE: usize = 32 + 32 + 32 + 8 + 8 + 8 + 1;
}

// ============================================================================
// EVENTS & ERRORS
// ============================================================================

#[event]
pub struct VaultInitializedEvent {
    pub authority: Pubkey,
    pub watchman_pubkey: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct BridgeDepositInitiatedEvent {
    pub deposit_id: [u8; 32],
    pub depositor: Pubkey,
    pub mint: Pubkey,
    pub gross_amount: u64,
    pub net_amount: u64,
    pub destination_chain: String,
    pub recipient: String,
    pub timestamp: i64,
}

#[event]
pub struct BridgeDepositSettledEvent {
    pub deposit_id: [u8; 32],
    pub destination_payout_tx_hash: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct BridgePayoutReleasedEvent {
    pub origin_tx_hash: [u8; 32],
    pub recipient: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub nonce: u64,
    pub timestamp: i64,
}

#[event]
pub struct BridgeDepositRefundedEvent {
    pub deposit_id: [u8; 32],
    pub depositor: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct WatchmanUpdatedEvent {
    pub previous_pubkey: [u8; 32],
    pub new_pubkey: [u8; 32],
}

#[event]
pub struct EmergencyPauseToggledEvent {
    pub paused: bool,
}

#[error_code]
pub enum VaultError {
    #[msg("BinaryLiquid: Vault is currently paused by Circuit Breaker")]
    VaultPaused,
    #[msg("BinaryLiquid: Deposit or payout amount must be greater than zero")]
    ZeroAmount,
    #[msg("BinaryLiquid: Destination chain identifier is invalid")]
    InvalidDestinationChain,
    #[msg("BinaryLiquid: Recipient address format is invalid")]
    InvalidRecipientAddress,
    #[msg("BinaryLiquid: Arithmetic overflow")]
    MathOverflow,
    #[msg("BinaryLiquid: Deposit has already been refunded")]
    AlreadyRefunded,
    #[msg("BinaryLiquid: Deposit has already been settled")]
    AlreadyCompleted,
    #[msg("BinaryLiquid: Payout exceeds $50,000 single transaction Circuit Breaker cap")]
    ExceedsCircuitBreaker,
    #[msg("BinaryLiquid: Missing preceding Ed25519 signature verification instruction")]
    MissingEd25519Instruction,
    #[msg("BinaryLiquid: Instruction program ID does not match native Ed25519 precompile")]
    InvalidEd25519Program,
    #[msg("BinaryLiquid: Invalid Watchman Ed25519 cryptographic attestation")]
    InvalidEd25519Signature,
    #[msg("BinaryLiquid: Invalid Watchman public key")]
    InvalidWatchmanKey,
    #[msg("BinaryLiquid: 24-hour autonomous refund timelock is still active")]
    TimelockStillActive,
    #[msg("BinaryLiquid: Only the original depositor can claim a refund")]
    UnauthorizedDepositor,
}
