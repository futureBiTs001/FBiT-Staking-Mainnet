'use client';

/**
 * Solana FBiTStaking Anchor contract service
 *
 * Stake entry PDA is seeded with [b"stake", owner_pubkey, stakeId_le_bytes].
 * stakeId = user_account.stake_count at the time of staking (monotonic counter).
 * The `stakeId` stored in StakeEntry lets the client re-derive the PDA for
 * claim / compound / unstake.
 *
 * All public methods throw on error — callers should catch.
 * Amount parameters are in token units (not lamports).
 */

import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { IDL } from './idl';
import { NETWORK_CONFIG } from '@/lib/config';
import type { PlatformStats, StakeEntry, UserAccount, ReferralInfo } from '@/types';

function getProgramId(): PublicKey {
  const addr = NETWORK_CONFIG.solana.contractAddress;
  if (!addr) throw new Error('Solana program ID not configured. Set NEXT_PUBLIC_SOLANA_PROGRAM_ID in your .env.local');
  return new PublicKey(addr);
}
const DECIMALS   = 6;
const SCALE      = 10 ** DECIMALS;

function toLamports(amount: number): BN {
  return new BN(Math.floor(amount * SCALE));
}
function fromLamports(n: BN | number): number {
  return (typeof n === 'number' ? n : n.toNumber()) / SCALE;
}

// ── PDA derivations ────────────────────────────────────────────────────────────

function platformPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('platform')], getProgramId());
}

function userPda(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('user'), owner.toBuffer()], getProgramId());
}

function stakeEntryPda(owner: PublicKey, stakeId: number): [PublicKey, number] {
  const id = new BN(stakeId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('stake'), owner.toBuffer(), id.toArrayLike(Buffer, 'le', 8)],
    getProgramId()
  );
}

// ── Provider / Program helpers ─────────────────────────────────────────────────

/**
 * Returns whichever Solana wallet is currently connected.
 * Checks Phantom, Solflare, Backpack, and Jupiter in order.
 */
function getSolanaWallet(): any {
  const w = (window as any);
  const candidates = [w.solana, w.solflare, w.backpack, w.jupiter];
  const wallet = candidates.find(c => c?.isConnected && c?.publicKey);
  if (!wallet?.publicKey) throw new Error('Solana wallet not connected.');
  return wallet;
}

function getProvider(): AnchorProvider {
  const wallet = getSolanaWallet();
  const connection = new Connection(NETWORK_CONFIG.solana.rpcUrl, 'confirmed');
  return new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
}

function getProgram(): Program {
  return new (Program as any)(IDL as any, getProgramId(), getProvider()) as Program;
}

function getOwner(): PublicKey {
  const wallet = getSolanaWallet();
  return new PublicKey(wallet.publicKey.toString());
}

/**
 * Stake vault = ATA( stakeMint, platformPDA ).
 * If NEXT_PUBLIC_SOLANA_STAKE_VAULT is set in env it takes priority (custom vaults).
 * Otherwise the address is derived automatically — no env var required.
 */
function getStakeVault(): PublicKey {
  const envAddr = NETWORK_CONFIG.solana.stakeVaultAddress;
  if (envAddr && envAddr.length > 10 && !envAddr.toUpperCase().startsWith('YOUR_')) {
    return new PublicKey(envAddr);
  }
  const [platPda] = platformPda();
  const stakeMint = new PublicKey(NETWORK_CONFIG.solana.stakeTokenAddress);
  return ata(stakeMint, platPda);
}

/**
 * Reward vault = ATA( rewardMint, platformPDA ).
 * If NEXT_PUBLIC_SOLANA_REWARD_VAULT is set in env it takes priority.
 * Otherwise derived automatically.
 */
function getRewardVault(): PublicKey {
  const envAddr = NETWORK_CONFIG.solana.rewardVaultAddress;
  if (envAddr && envAddr.length > 10 && !envAddr.toUpperCase().startsWith('YOUR_')) {
    return new PublicKey(envAddr);
  }
  const [platPda] = platformPda();
  const rewardMint = new PublicKey(NETWORK_CONFIG.solana.rewardTokenAddress);
  return ata(rewardMint, platPda);
}

/**
 * Reserve vault = separate ATA( rewardMint, platformPDA ) for the long-term emission reserve.
 * If NEXT_PUBLIC_SOLANA_RESERVE_VAULT is set in env it takes priority.
 * Otherwise derived automatically (uses the same mint, different seed — but since ATA is
 * deterministic per (mint, owner), a custom vault address MUST be set in env to separate it
 * from the reward vault. Without env var, falls back to same address as reward vault, which
 * is acceptable only for single-vault deployments.
 */
function getReserveVault(): PublicKey {
  const envAddr = NETWORK_CONFIG.solana.reserveVaultAddress;
  if (envAddr && envAddr.length > 10 && !envAddr.toUpperCase().startsWith('YOUR_')) {
    return new PublicKey(envAddr);
  }
  // Fallback: same as reward vault (single-vault mode — reserve and reward share one vault)
  return getRewardVault();
}

/** Derive the ATA for `owner` and `mint` — works synchronously via Anchor utils */
function ata(mint: PublicKey, owner: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  return address;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function solanaFetchPlatformStats(): Promise<PlatformStats | null> {
  try {
    const program = getProgram();
    const [pda] = platformPda();
    const platform: any = await (program.account as any).platform.fetch(pda);

    const totalStaked = fromLamports(platform.totalStaked);

    // Reserve / emission fields (new on-chain fields)
    const totalReserve          = platform.totalReserve          ? fromLamports(platform.totalReserve)          : 0;
    const totalEmissionReleased = platform.totalEmissionReleased ? fromLamports(platform.totalEmissionReleased) : 0;
    const emissionStartTime     = platform.emissionStartTime     ? platform.emissionStartTime.toNumber()        : 0;
    const annualEmission        = platform.annualEmission        ? fromLamports(platform.annualEmission)        : 0;
    // Halving epoch tracking
    const halvingEpoch          = platform.halvingEpoch          ? Number(platform.halvingEpoch)                : 0;
    const halvingStartTime      = platform.halvingStartTime      ? Number(platform.halvingStartTime)            : (emissionStartTime || 0);

    // PoS dynamic APY: emission / totalStaked, clamped 60%–250% (6000–25000 bps).
    // Fallback also clamped to PoS range so default is always 60%–250%.
    const effectiveAPY = (annualEmission > 0 && totalStaked > 0)
      ? Math.min(25_000, Math.max(6_000, Math.round(annualEmission / totalStaked * 10_000)))
      : Math.min(25_000, Math.max(6_000, platform.baseApy ? Number(platform.baseApy[0]) : 6_000));
    const burnBps               = platform.burnBps               ? platform.burnBps.toNumber()                  : 1000;

    // Compute releasable emission client-side
    let releasableEmission = 0;
    if (annualEmission > 0 && emissionStartTime > 0) {
      const nowSecs     = Math.floor(Date.now() / 1000);
      const elapsed     = nowSecs - emissionStartTime;
      const secsPerYear = 365 * 86400;
      const totalReleasable = annualEmission * (elapsed / secsPerYear);
      releasableEmission = Math.max(0, totalReleasable - totalEmissionReleased);
      releasableEmission = Math.min(releasableEmission, totalReserve);
    }

    return {
      totalStaked,
      totalUsers:            platform.totalUsers.toNumber(),
      rewardPoolBalance:     fromLamports(platform.rewardPoolBalance),
      rewardRate:            platform.rewardRate.toNumber(),
      referralRewardRate:    platform.referralRewardRate.toNumber(),
      isPaused:              platform.isPaused,
      totalBurned:           fromLamports(platform.totalBurned),
      annualEmission,
      burnBps,
      effectiveAPY,
      isRenounced:           Boolean(platform.isRenounced),
      feeRecipient:          platform.feeRecipient?.toString() ?? '',
      totalFeesCollected:    fromLamports(platform.totalFeesCollected),
      totalReserve,
      emissionStartTime,
      totalEmissionReleased,
      releasableEmission,
      halvingEpoch,
      halvingStartTime,
    };
  } catch {
    return null;
  }
}

export async function solanaIsRegistered(owner: PublicKey): Promise<boolean> {
  try {
    const program = getProgram();
    const [pda] = userPda(owner);
    await (program.account as any).userAccount.fetch(pda);
    return true;
  } catch {
    return false;
  }
}

export async function solanaRegisterUser(referrer?: string): Promise<{ txHash: string }> {
  const program  = getProgram();
  const owner    = getOwner();
  const [platPda] = platformPda();
  const [userAccPda] = userPda(owner);

  let referrerPubkey: PublicKey | null = null;
  let referrerAccPda = userAccPda; // fallback (skipped when referrer == None)

  if (referrer) {
    try {
      referrerPubkey = new PublicKey(referrer);
      [referrerAccPda] = userPda(referrerPubkey);
    } catch {}
  }

  const tx = await (program.methods as any)
    .registerUser(referrerPubkey)
    .accounts({
      platform:       platPda,
      userAccount:    userAccPda,
      referrerAccount: referrerAccPda,
      owner,
      systemProgram:  SystemProgram.programId,
    })
    .rpc();

  return { txHash: tx };
}

export async function solanaStake(
  amount: number,
  referrer?: string
): Promise<{ txHash: string; stakedAt: number }> {
  const program  = getProgram();
  const owner    = getOwner();
  const [platPda] = platformPda();
  const [userAccPda] = userPda(owner);

  // Auto-register
  const registered = await solanaIsRegistered(owner);
  if (!registered) {
    await solanaRegisterUser(referrer);
  }

  // Fetch current stake_count — this is the PDA seed for the new entry
  const [userAccPdaForCount] = userPda(owner);
  let stakeId = 0;
  try {
    const userAccData: any = await (program.account as any).userAccount.fetch(userAccPdaForCount);
    stakeId = userAccData.stakeCount.toNumber();
  } catch {}

  const [stakeEntryAccPda] = stakeEntryPda(owner, stakeId);

  const stakeMint   = new PublicKey(NETWORK_CONFIG.solana.stakeTokenAddress);
  const rewardMint  = new PublicKey(NETWORK_CONFIG.solana.rewardTokenAddress);
  const userTokenAcc = ata(stakeMint, owner);
  const stakeVault   = getStakeVault();
  const rewardVault  = getRewardVault();

  // Resolve admin stake account (authority's stake-mint ATA)
  let adminStakeAccount = userTokenAcc; // fallback (unused when renounced)
  try {
    const platform: any = await (program.account as any).platform.fetch(platPda);
    if (!platform.isRenounced && platform.authority) {
      const authorityKey = new PublicKey(platform.authority.toString());
      adminStakeAccount = ata(stakeMint, authorityKey);
    }
  } catch {}

  // Build remaining_accounts: walk the referral chain up to 10 levels.
  // Each level contributes 2 accounts: [UserAccount PDA (writable), reward ATA (writable)].
  const remainingAccounts: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[] = [];
  try {
    // The staker's own account already has referrer stored on-chain (set during registerUser).
    const userAccData: any = await (program.account as any).userAccount.fetch(userAccPda);
    let currentReferrerKey: PublicKey | null = userAccData.referrer
      ? new PublicKey(userAccData.referrer.toString())
      : null;

    for (let lvl = 0; lvl < 10 && currentReferrerKey !== null; lvl++) {
      const [referrerUserPda] = userPda(currentReferrerKey);
      const referrerRewardAta = ata(rewardMint, currentReferrerKey);

      remainingAccounts.push(
        { pubkey: referrerUserPda, isSigner: false, isWritable: true },
        { pubkey: referrerRewardAta, isSigner: false, isWritable: true },
      );

      // Fetch next ancestor's key (for the next loop iteration)
      try {
        const refData: any = await (program.account as any).userAccount.fetch(referrerUserPda);
        currentReferrerKey = refData.referrer
          ? new PublicKey(refData.referrer.toString())
          : null;
      } catch {
        break; // ancestor account not found — chain ends here
      }
    }
  } catch {
    // Chain fetch failed — proceed without referral rewards (safe degradation)
  }

  const tx = await (program.methods as any)
    .stake(toLamports(amount), 0)
    .accounts({
      platform:         platPda,
      userAccount:      userAccPda,
      stakeEntry:       stakeEntryAccPda,
      userTokenAccount: userTokenAcc,
      stakeVault,
      adminStakeAccount,
      rewardVault,
      owner,
      tokenProgram:     TOKEN_PROGRAM_ID,
      systemProgram:    SystemProgram.programId,
    })
    .remainingAccounts(remainingAccounts)
    .rpc();

  // stakeId is the stake_count fetched before sending the tx — deterministic PDA seed.
  // Store it so claim/compound/unstake can re-derive the correct PDA.
  return { txHash: tx, stakedAt: stakeId };
}

export async function solanaClaimRewards(
  stakeId: number | string,
  _stakedAt: number
): Promise<{ txHash: string; reward: number }> {
  const program  = getProgram();
  const owner    = getOwner();
  const [platPda] = platformPda();
  const [userAccPda] = userPda(owner);
  const [stakeEntryAccPda] = stakeEntryPda(owner, Number(stakeId));

  // Read pending reward before claiming
  let reward = 0;
  try {
    const entry: any = await (program.account as any).stakeEntry.fetch(stakeEntryAccPda);
    const now = Math.floor(Date.now() / 1000);
    // Match contract: reward accrues per completed 12h interval
    const intervals = Math.floor((now - entry.lastClaimAt.toNumber()) / 43200);
    reward = fromLamports(entry.amount) * entry.apy.toNumber() * intervals / (730 * 10_000);
  } catch {}

  const rewardMint = new PublicKey(NETWORK_CONFIG.solana.rewardTokenAddress);
  const userTokenAcc = ata(rewardMint, owner);
  const rewardVault  = getRewardVault();

  // Fetch platform to check renounced state and get fee_recipient
  const [pda] = platformPda();
  let adminRewardAccount = userTokenAcc; // fallback: pass user's ATA (unused when renounced)
  let feeRecipientTokenAccount = userTokenAcc; // fallback (unused when NOT renounced)
  try {
    const platform: any = await (program.account as any).platform.fetch(pda);
    if (platform.isRenounced && platform.feeRecipient) {
      const feeRecipientKey = new PublicKey(platform.feeRecipient.toString());
      feeRecipientTokenAccount = ata(rewardMint, feeRecipientKey);
      adminRewardAccount       = feeRecipientTokenAccount; // pass something valid for the constraint
    } else {
      const authorityKey = new PublicKey(platform.authority.toString());
      adminRewardAccount = ata(rewardMint, authorityKey);
    }
  } catch {}

  // IDL requires stakeEntryId (u64) = the stake_id used as PDA seed
  const tx = await (program.methods as any)
    .claimRewards(new BN(Number(stakeId)))
    .accounts({
      platform:                   platPda,
      userAccount:                userAccPda,
      stakeEntry:                 stakeEntryAccPda,
      userTokenAccount:           userTokenAcc,
      rewardVault,
      adminRewardAccount,
      rewardTokenMint:            rewardMint,
      feeRecipientTokenAccount,
      owner,
      tokenProgram:               TOKEN_PROGRAM_ID,
    })
    .rpc();

  return { txHash: tx, reward };
}

export async function solanaCompoundRewards(
  stakeId: number | string,
  _stakedAt: number
): Promise<{ txHash: string; reward: number }> {
  const program  = getProgram();
  const owner    = getOwner();
  const [platPda] = platformPda();
  const [userAccPda] = userPda(owner);
  const [stakeEntryAccPda] = stakeEntryPda(owner, Number(stakeId));

  let reward = 0;
  try {
    const entry: any = await (program.account as any).stakeEntry.fetch(stakeEntryAccPda);
    const now = Math.floor(Date.now() / 1000);
    // Match contract: reward accrues per completed 12h interval
    const intervals = Math.floor((now - entry.lastClaimAt.toNumber()) / 43200);
    reward = fromLamports(entry.amount) * entry.apy.toNumber() * intervals / (730 * 10_000);
  } catch {}

  const rewardMint  = new PublicKey(NETWORK_CONFIG.solana.rewardTokenAddress);
  const rewardVault = getRewardVault();

  // Resolve admin/fee-recipient accounts based on renounce state
  const [pda] = platformPda();
  let adminRewardAccount        = ata(rewardMint, owner); // fallback
  let feeRecipientTokenAccount  = ata(rewardMint, owner); // fallback
  try {
    const platform: any = await (program.account as any).platform.fetch(pda);
    if (platform.isRenounced && platform.feeRecipient) {
      const feeRecipientKey = new PublicKey(platform.feeRecipient.toString());
      feeRecipientTokenAccount = ata(rewardMint, feeRecipientKey);
      adminRewardAccount       = feeRecipientTokenAccount;
    } else {
      const authorityKey = new PublicKey(platform.authority.toString());
      adminRewardAccount = ata(rewardMint, authorityKey);
    }
  } catch {}

  const tx = await (program.methods as any)
    .compoundRewards()
    .accounts({
      platform:                  platPda,
      userAccount:               userAccPda,
      stakeEntry:                stakeEntryAccPda,
      rewardVault,
      adminRewardAccount,
      rewardTokenMint:           rewardMint,
      feeRecipientTokenAccount,
      owner,
      tokenProgram:              TOKEN_PROGRAM_ID,
    })
    .rpc();

  return { txHash: tx, reward };
}

export async function solanaUnstake(stakeId: number): Promise<{ txHash: string }> {
  const program  = getProgram();
  const owner    = getOwner();
  const [platPda] = platformPda();
  const [userAccPda] = userPda(owner);
  const [stakeEntryAccPda] = stakeEntryPda(owner, stakeId);

  const stakeMint    = new PublicKey(NETWORK_CONFIG.solana.stakeTokenAddress);
  const userTokenAcc = ata(stakeMint, owner);
  const stakeVault   = getStakeVault();

  // Resolve admin stake account (authority's stake-mint ATA); fallback when renounced
  let adminStakeAccount = userTokenAcc;
  try {
    const platform: any = await (program.account as any).platform.fetch(platPda);
    if (!platform.isRenounced && platform.authority) {
      adminStakeAccount = ata(stakeMint, new PublicKey(platform.authority.toString()));
    }
  } catch {}

  const tx = await (program.methods as any)
    .unstake()
    .accounts({
      platform:         platPda,
      userAccount:      userAccPda,
      stakeEntry:       stakeEntryAccPda,
      userTokenAccount: userTokenAcc,
      stakeVault,
      adminStakeAccount,
      owner,
      tokenProgram:     TOKEN_PROGRAM_ID,
    })
    .rpc();

  return { txHash: tx };
}

// ── Admin ──────────────────────────────────────────────────────────────────────

export async function solanaFundRewardPool(amount: number): Promise<{ txHash: string }> {
  if (amount < 1)           throw new Error('Minimum deposit is 1 FBiT');
  if (amount > 800_000_000) throw new Error('Maximum deposit is 800,000,000 FBiT (800M)');
  const program  = getProgram();
  const owner    = getOwner();
  const [platPda] = platformPda();

  const rewardMint   = new PublicKey(NETWORK_CONFIG.solana.rewardTokenAddress);
  const funderTokenAcc = ata(rewardMint, owner);
  const rewardVault  = getRewardVault();

  const tx = await (program.methods as any)
    .fundRewardPool(toLamports(amount))
    .accounts({
      platform:           platPda,
      authority:          owner,
      funderTokenAccount: funderTokenAcc,
      rewardVault,
      tokenProgram:       TOKEN_PROGRAM_ID,
    })
    .rpc();

  return { txHash: tx };
}

export async function solanaRefundRewardPool(amount: number): Promise<{ txHash: string }> {
  if (amount <= 0) throw new Error('Refund amount must be greater than 0');
  const program  = getProgram();
  const owner    = getOwner();
  const [platPda] = platformPda();

  const rewardMint          = new PublicKey(NETWORK_CONFIG.solana.rewardTokenAddress);
  const authorityTokenAcc   = ata(rewardMint, owner);
  const rewardVault         = getRewardVault();

  const tx = await (program.methods as any)
    .refundRewardPool(toLamports(amount))
    .accounts({
      platform:              platPda,
      authority:             owner,
      authorityTokenAccount: authorityTokenAcc,
      rewardVault,
      tokenProgram:          TOKEN_PROGRAM_ID,
    })
    .rpc();

  return { txHash: tx };
}

export async function solanaDepositReserve(amount: number): Promise<{ txHash: string }> {
  if (amount < 1)           throw new Error('Minimum deposit is 1 FBiT');
  if (amount > 800_000_000) throw new Error('Maximum deposit is 800,000,000 FBiT (800M)');
  const program   = getProgram();
  const owner     = getOwner();
  const [platPda] = platformPda();
  const rewardMint       = new PublicKey(NETWORK_CONFIG.solana.rewardTokenAddress);
  const funderTokenAcc   = ata(rewardMint, owner);
  const reserveVault     = getReserveVault();
  const tx = await (program.methods as any)
    .depositReserve(toLamports(amount))
    .accounts({
      platform:           platPda,
      authority:          owner,
      funderTokenAccount: funderTokenAcc,
      reserveVault,
      tokenProgram:       TOKEN_PROGRAM_ID,
    })
    .rpc();
  return { txHash: tx };
}

export async function solanaReleaseEmission(): Promise<{ txHash: string }> {
  const program   = getProgram();
  const [platPda] = platformPda();
  const reserveVault = getReserveVault();
  const rewardVault  = getRewardVault();
  const tx = await (program.methods as any)
    .releaseEmission()
    .accounts({
      platform:     platPda,
      reserveVault,
      rewardVault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
  return { txHash: tx };
}

export async function solanaSetRewardRate(rate: number): Promise<{ txHash: string }> {
  const program  = getProgram();
  const owner    = getOwner();
  const [platPda] = platformPda();
  const tx = await (program.methods as any).setRewardRate(new BN(rate))
    .accounts({ platform: platPda, authority: owner }).rpc();
  return { txHash: tx };
}

export async function solanaSetReferralRewardRate(rate: number): Promise<{ txHash: string }> {
  const program  = getProgram();
  const owner    = getOwner();
  const [platPda] = platformPda();
  const tx = await (program.methods as any).setReferralRewardRate(new BN(rate))
    .accounts({ platform: platPda, authority: owner }).rpc();
  return { txHash: tx };
}

export async function solanaBlockUser(userAddress: string): Promise<{ txHash: string }> {
  const program  = getProgram();
  const owner    = getOwner();
  const [platPda] = platformPda();
  const targetKey = new PublicKey(userAddress);
  const [targetPda] = userPda(targetKey);
  const tx = await (program.methods as any).blockUser()
    .accounts({ platform: platPda, userAccount: targetPda, authority: owner }).rpc();
  return { txHash: tx };
}

export async function solanaUnblockUser(userAddress: string): Promise<{ txHash: string }> {
  const program  = getProgram();
  const owner    = getOwner();
  const [platPda] = platformPda();
  const targetKey = new PublicKey(userAddress);
  const [targetPda] = userPda(targetKey);
  const tx = await (program.methods as any).unblockUser()
    .accounts({ platform: platPda, userAccount: targetPda, authority: owner }).rpc();
  return { txHash: tx };
}

export async function solanaTogglePause(): Promise<{ txHash: string }> {
  const program  = getProgram();
  const owner    = getOwner();
  const [platPda] = platformPda();
  const tx = await (program.methods as any).togglePause()
    .accounts({ platform: platPda, authority: owner }).rpc();
  return { txHash: tx };
}

export async function solanaSetAnnualEmission(annualEmission: number): Promise<{ txHash: string }> {
  if (annualEmission <= 0) throw new Error('Annual emission must be greater than 0');
  const program   = getProgram();
  const owner     = getOwner();
  const [platPda] = platformPda();
  const tx = await (program.methods as any)
    .setAnnualEmission(toLamports(annualEmission))
    .accounts({ platform: platPda, authority: owner })
    .rpc();
  return { txHash: tx };
}

export async function solanaSetBurnBps(burnBps: number): Promise<{ txHash: string }> {
  if (burnBps < 0 || burnBps > 5000) throw new Error('Burn BPS must be 0–5000');
  const program   = getProgram();
  const owner     = getOwner();
  const [platPda] = platformPda();
  const tx = await (program.methods as any)
    .setBurnBps(new BN(burnBps))
    .accounts({ platform: platPda, authority: owner })
    .rpc();
  return { txHash: tx };
}

/**
 * Update a Team Target Bonus tier.
 * @param index          Tier index 0–9
 * @param minTeamStaked  Minimum team total staked in token units (not lamports)
 * @param bonusBps       Bonus in basis points (max 1000 = 10 %)
 */
export async function solanaSetTeamTargetTier(
  index: number,
  minTeamStaked: number,
  bonusBps: number
): Promise<{ txHash: string }> {
  const program   = getProgram();
  const owner     = getOwner();
  const [platPda] = platformPda();
  const tx = await (program.methods as any)
    .setTeamTargetTier(index, toLamports(minTeamStaked), new BN(bonusBps))
    .accounts({ platform: platPda, authority: owner })
    .rpc();
  return { txHash: tx };
}

/**
 * Set the fallback base APY for the single lock period (index 0).
 * Only applies when annual_emission is 0 — PoS emission overrides this.
 * apyBps: basis points (e.g. 6000 = 60%)
 */
export async function solanaSetBatchApy(apyBps: number): Promise<{ txHash: string }> {
  if (apyBps < 6_000 || apyBps > 25_000) throw new Error('Base APY must be 6000–25000 BPS (60%–250%)');
  const program   = getProgram();
  const owner     = getOwner();
  const [platPda] = platformPda();
  const tx = await (program.methods as any)
    .setBatchApy([new BN(apyBps)])
    .accounts({ platform: platPda, authority: owner })
    .rpc();
  return { txHash: tx };
}

/**
 * Permanently renounce ownership. Only callable by current authority.
 * After this call, all admin functions are locked and a 25% passive fee
 * is paid to the former owner on every claim/compound.
 */
export async function solanaRenounceOwnership(): Promise<{ txHash: string }> {
  const program   = getProgram();
  const authority = getOwner();
  const [platPda] = platformPda();
  const tx = await (program.methods as any)
    .renounceOwnership()
    .accounts({ platform: platPda, authority })
    .rpc();
  return { txHash: tx };
}


// ── Read-only helpers ──────────────────────────────────────────────────────────

/** Returns a read-only Anchor program instance (no wallet signer required). */
function getReadOnlyProgram(): Program {
  const connection = new Connection(NETWORK_CONFIG.solana.rpcUrl, 'confirmed');
  // Anchor requires a wallet shape but read ops don't sign anything
  const noopWallet = {
    publicKey: new PublicKey('11111111111111111111111111111111'),
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };
  const provider = new AnchorProvider(connection, noopWallet as any, { commitment: 'confirmed' });
  return new (Program as any)(IDL as any, getProgramId(), provider) as Program;
}

/**
 * Fetch all active StakeEntry accounts for a given owner.
 * Uses a memcmp filter on the owner field (offset 8, after discriminator).
 */
export async function solanaGetUserStakes(ownerAddress: string): Promise<StakeEntry[]> {
  try {
    const owner = new PublicKey(ownerAddress);
    const program = getReadOnlyProgram();
    const all = await (program.account as any).stakeEntry.all([
      { memcmp: { offset: 8, bytes: owner.toBase58() } },
    ]);
    return (all as any[])
      .filter((e: any) => e.account.isActive)
      .map((e: any): StakeEntry => {
        const stakeId  = e.account.stakeId.toNumber();
        const stakedAt = e.account.stakedAt.toNumber();
        return {
          id:              stakeId,  // stake_count — used as PDA seed for claim/compound/unstake
          amount:          fromLamports(e.account.amount),
          lockPeriodIndex: e.account.lockPeriodIndex,
          stakedAt,
          unlockAt:        e.account.unlockAt.toNumber(),
          lastClaimAt:     e.account.lastClaimAt.toNumber(),
          totalClaimed:    fromLamports(e.account.totalClaimed),
          isActive:        e.account.isActive,
          apy:             e.account.apy.toNumber(),
        };
      });
  } catch {
    return [];
  }
}

// Raw JSON-RPC helper — bypasses @solana/web3.js Connection to avoid URL
// manipulation issues with the Next.js dev proxy (trailingSlash redirect).
async function rpcCall(endpoint: string, method: string, params: unknown[]): Promise<any> {
  const res = await fetch(endpoint, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'RPC error');
  return json.result;
}

/**
 * Fetch the FBiT SPL token balance for a wallet address.
 * On localhost: proxies through /dev-rpc/solana/ (Next.js rewrite) — avoids
 * the 403 that Solana public RPCs return for browser requests from localhost.
 * On production: calls the configured RPC directly (production domains not blocked).
 * Returns 0 if the wallet has no token account for this mint.
 */
export async function solanaGetTokenBalance(ownerAddress: string): Promise<number> {
  if (!ownerAddress || ownerAddress.startsWith('0x')) return 0;
  const stakeTokenAddr = NETWORK_CONFIG.solana.stakeTokenAddress;
  if (!stakeTokenAddr || stakeTokenAddr.length < 10 || stakeTokenAddr.toUpperCase().startsWith('YOUR_')) return 0;

  let ownerPk: PublicKey, mintPk: PublicKey;
  try { ownerPk = new PublicKey(ownerAddress); mintPk = new PublicKey(stakeTokenAddr); } catch { return 0; }

  // Derive Associated Token Account address deterministically — no RPC needed
  const [ataAddress] = PublicKey.findProgramAddressSync(
    [ownerPk.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintPk.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const endpoints = [
    'https://solana-rpc.publicnode.com',
    NETWORK_CONFIG.solana.rpcUrl,
    'https://api.mainnet-beta.solana.com',
  ].filter((u, i, a) => u && a.indexOf(u) === i);

  for (const rpc of endpoints) {
    try {
      const result = await rpcCall(rpc, 'getAccountInfo', [
        ataAddress.toString(),
        { encoding: 'jsonParsed' },
      ]);
      // null value means ATA doesn't exist yet → 0 balance
      if (!result?.value) return 0;
      return result.value.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0;
    } catch {
      // try next endpoint
    }
  }
  return 0;
}

export async function solanaGetUserAccount(ownerAddress: string): Promise<UserAccount | null> {
  try {
    const program = getProgram();
    const owner = new PublicKey(ownerAddress);
    const [pda] = userPda(owner);
    const acc = await (program.account as any).userAccount.fetch(pda);
    return {
      address:              ownerAddress,
      totalStaked:          fromLamports(acc.totalStaked),
      totalRewardsEarned:   fromLamports(acc.totalRewardsEarned),
      totalReferralRewards: fromLamports(acc.totalReferralRewards),
      referrer:             acc.referrer ? acc.referrer.toBase58() : null,
      referralCount:        acc.referralCount.toNumber(),
      teamSize:             acc.teamSize    ? acc.teamSize.toNumber()          : 0,
      teamTotalStaked:      acc.teamTotalStaked ? fromLamports(acc.teamTotalStaked) : 0,
      isBlocked:            acc.isBlocked,
      registeredAt:         acc.registeredAt.toNumber(),
    };
  } catch {
    return null;
  }
}

export async function solanaGetReferralInfo(ownerAddress: string): Promise<ReferralInfo | null> {
  try {
    const program    = getProgram();
    const owner      = new PublicKey(ownerAddress);
    const [pda]      = userPda(owner);
    const acc        = await (program.account as any).userAccount.fetch(pda);
    const totalReferrals       = acc.referralCount.toNumber();
    const totalReferralRewards = fromLamports(acc.totalReferralRewards);

    // Fetch Level-1 referrals: scan all UserAccount PDAs whose `referrer` == owner.
    // UserAccount layout (after 8-byte discriminator, all offsets are into raw data):
    //   owner:                  Pubkey  → data[8]–data[39]   (32 bytes)
    //   total_staked:           u64     → data[40]–data[47]
    //   total_rewards_earned:   u64     → data[48]–data[55]
    //   total_referral_rewards: u64     → data[56]–data[63]
    //   referrer:               Option<Pubkey> → data[64]–data[96]
    //     • data[64]      = 0 (None) | 1 (Some)
    //     • data[65]–[96] = pubkey when Some  ← memcmp target
    //   referral_count:         u64     → data[97]–data[104]
    //   is_blocked:             bool    → data[105]
    //   registered_at:          i64     → data[106]–data[113]  (slice[98]–slice[105])
    //   team_size:              u64     → data[114]–data[121]  (slice[106]–slice[113])
    //   team_total_staked:      u64     → data[122]–data[129]  (slice[114]–slice[121])
    const referrals: import('@/types').ReferralEntry[] = [];
    try {
      const connection = new Connection(NETWORK_CONFIG.solana.rpcUrl, 'confirmed');
      const programId  = getProgramId();

      const accounts = await connection.getProgramAccounts(programId, {
        filters: [
          { dataSize: 152 },   // USER_ACCOUNT_SPACE
          // Match accounts where the referrer Option<Pubkey> = Some(owner):
          // offset 65 skips the discriminator (8) + fields before referrer (56) + Option tag byte (1)
          { memcmp: { offset: 65, bytes: owner.toBase58() } },
        ],
      });

      for (const { account } of accounts.slice(0, 50)) {
        try {
          const data  = account.data;
          const slice = Buffer.from(data).subarray(8); // strip 8-byte Anchor discriminator
          // Parse owner pubkey (slice[0]–slice[31])
          const refOwner = new PublicKey(Uint8Array.from(slice.subarray(0, 32))).toBase58();
          // Parse total_staked (slice[32]–slice[39])
          const staked = Number(slice.readBigUInt64LE(32)) / SCALE;
          // Parse registered_at (slice[98]–slice[105])
          const registeredAt = Number(slice.readBigInt64LE(98));
          referrals.push({
            address:      refOwner,
            level:        1,
            stakedAmount: staked,
            rewardEarned: 0,
            registeredAt,
          });
        } catch { /* skip malformed accounts */ }
      }
    } catch { /* getProgramAccounts failed — return without referral list */ }

    return {
      totalReferrals,
      totalReferralRewards,
      referralLink: '',
      referrals,
      chain:        [],
    };
  } catch {
    return null;
  }
}

/**
 * Permissionless: trigger the annual base-APY halving.
 * Can only succeed once every 365 days; contract enforces the time lock.
 */
export async function solanaTriggerHalving(): Promise<{ txHash: string }> {
  const program   = getProgram();
  const owner     = getOwner();
  const [platPda] = platformPda();
  const tx = await (program.methods as any)
    .triggerHalving()
    .accounts({ platform: platPda, caller: owner })
    .rpc();
  return { txHash: tx };
}

/**
 * Admin / crank: update a user's team_size and team_total_staked on-chain.
 * Called after indexing stake/unstake events.
 */
export async function solanaUpdateUserTeamStats(
  userAddress: string,
  teamSize: number,
  teamTotalStaked: number
): Promise<{ txHash: string }> {
  const program   = getProgram();
  const owner     = getOwner();
  const [platPda] = platformPda();
  const targetKey = new PublicKey(userAddress);
  const [targetPda] = userPda(targetKey);
  const tx = await (program.methods as any)
    .updateUserTeamStats(new BN(teamSize), toLamports(teamTotalStaked))
    .accounts({ platform: platPda, userAccount: targetPda, authority: owner })
    .rpc();
  return { txHash: tx };
}

// ── On-chain history ───────────────────────────────────────────────────────────

const INSTRUCTION_TYPE_MAP: Record<string, import('@/types').TxRecord['type']> = {
  'Instruction: Stake':    'stake',
  'Instruction: Claim':    'claim',
  'Instruction: Compound': 'compound',
  'Instruction: Unstake':  'unstake',
};

/**
 * Fetch on-chain activity for a wallet from the Solana staking program.
 * Looks up signatures for the user's PDA (involved in all staking txns).
 * Returns TxRecord[] sorted newest-first.
 */
export async function solanaGetOnChainHistory(address: string): Promise<import('@/types').TxRecord[]> {
  const programAddr = NETWORK_CONFIG.solana.contractAddress;
  if (!programAddr || programAddr.toUpperCase().startsWith('YOUR_')) return [];

  try {
    const connection = new Connection(NETWORK_CONFIG.solana.rpcUrl || 'https://api.mainnet-beta.solana.com', 'confirmed');
    const owner = new PublicKey(address);
    const [userAccPda] = userPda(owner);

    const sigs = await connection.getSignaturesForAddress(userAccPda, { limit: 100 });
    const records: import('@/types').TxRecord[] = [];

    await Promise.allSettled(
      sigs.map(async (sig) => {
        if (sig.err) return;
        try {
          const tx = await connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed',
          });
          if (!tx) return;

          const logs: string[] = tx.meta?.logMessages ?? [];
          const ts = (sig.blockTime ?? 0) * 1000;

          let type: import('@/types').TxRecord['type'] | null = null;
          for (const log of logs) {
            for (const [key, val] of Object.entries(INSTRUCTION_TYPE_MAP)) {
              if (log.includes(key)) { type = val; break; }
            }
            if (type) break;
          }
          if (!type) return;

          // Try to read token balance delta for the user's stake ATA
          let amount = 0;
          const preBalances  = tx.meta?.preTokenBalances  ?? [];
          const postBalances = tx.meta?.postTokenBalances ?? [];
          const stakeMint = NETWORK_CONFIG.solana.stakeTokenAddress;

          const pre  = preBalances.find(b  => b.mint === stakeMint && b.owner === address);
          const post = postBalances.find(b => b.mint === stakeMint && b.owner === address);
          if (pre && post) {
            const diff = (post.uiTokenAmount.uiAmount ?? 0) - (pre.uiTokenAmount.uiAmount ?? 0);
            amount = Math.abs(diff);
          }

          const labelMap: Record<string, string> = {
            stake:    'Staked FBiT on Solana',
            claim:    'Claimed rewards on Solana',
            compound: 'Compounded rewards on Solana',
            unstake:  'Unstaked FBiT on Solana',
          };

          records.push({
            id: `sol-${sig.signature}`,
            type,
            label: labelMap[type],
            amount,
            txHash: sig.signature,
            timestamp: ts,
            status: 'success',
            network: 'solana',
          });
        } catch {
          // skip individual tx parse failures
        }
      })
    );

    return records.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

