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

import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, TransactionInstruction } from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { IDL } from './idl';
import { NETWORK_CONFIG } from '@/lib/config';
import { appKitModal, solanaWalletProvider, connectedSolanaAddress } from '@/lib/reown';
import type { PlatformStats, StakeEntry, UserAccount, ReferralInfo } from '@/types';

// Anchor discriminators: sha256("account:<Name>")[0..8] and sha256("global:<name>")[0..8]
// Computed offline — deterministic from names in the deployed program.
const ACCOUNT_DISCRIMINATORS: Record<string, number[]> = {
  Platform:    [77,  92, 204,  58, 187,  98,  91,  12],
  UserAccount: [211,  33, 136,  16, 186, 110, 242, 127],
  StakeEntry:  [187, 127,   9,  35, 155,  68,  86,  40],
};
// Instruction discriminators: sha256("global:<rust_snake_case_name>")[0..8]
// Old Anchor IDLs show camelCase names but programs use snake_case for hashing.
const IX_DISCRIMINATORS: Record<string, number[]> = {
  initialize:            [175, 175, 109,  31,  13, 152, 155, 237],
  fundRewardPool:        [ 85,  49, 108, 245, 204,  70, 243,   3],
  refundRewardPool:      [154, 132, 175,  20, 219, 145,  93, 120],
  depositReserve:        [187,  75, 224,  96, 122, 233, 220, 121],
  releaseEmission:       [248, 103, 174,  57,  15,  35, 227,  38],
  registerUser:          [  2, 241, 150, 223,  99, 214, 116,  97],
  stake:                 [206, 176, 202,  18, 200, 209, 179, 108],
  claimRewards:          [  4, 144, 132,  71, 116,  23, 151,  80],
  compoundRewards:       [254, 191, 226, 120,  82, 115,   5,  87],
  unstake:               [ 90,  95, 107,  42, 205, 124,  50, 225],
  setRewardRate:         [253, 201, 190,  20,  48,  38, 120,  34],
  setReferralRewardRate: [ 95,  48, 184,  35, 217, 109, 160, 125],
  blockUser:             [ 10, 164, 178,   6, 231, 175, 185, 191],
  unblockUser:           [216, 208, 128,  98,  74, 210,  18, 114],
  togglePause:           [238, 237, 206,  27, 255,  95, 123, 229],
  setAnnualEmission:     [ 23, 188,  62,  60, 159,  23, 116, 166],
  setBurnBps:            [226, 172, 145, 206, 238,  25,  16, 103],
  setTeamTargetTier:          [ 88, 230, 208,   7,  32, 138, 239,   4],
  setReferralPercentages:     [230,  34, 112, 247,  80, 147, 223,  93],
  setBatchApy:                [109,  76,  87, 205, 176, 242, 123,  34],
  renounceOwnership:     [ 19, 143,  91,  79,  34, 168, 174, 125],
  triggerHalving:        [  2, 170, 148,  87, 175, 253, 173,  80],
  updateUserTeamStats:   [137, 242, 244, 142, 224,  98, 192, 229],
  setLockPeriodApy:      [129,  70, 210,  21,  87, 145, 193, 150],
  fixBump:               [ 55, 162,  45, 211, 135, 185,  66, 103],
};

/**
 * Patch an old-format Anchor IDL for compatibility with Anchor 0.32:
 *  1. "publicKey" type string → "pubkey"       (borsh coder expects lowercase)
 *  2. isMut/isSigner → writable/signer          (new account descriptor format)
 *  3. Move account struct defs into idl.types   (0.32 reads types from types[], not accounts[])
 *  4. Convert idl.accounts to {name, discriminator} (0.32 new account format)
 *  5. Inject idl.address                         (0.32 reads programId from here)
 */
function patchIdl(rawIdl: any, programAddress: string): any {
  // Step 1 — replace "publicKey" type strings globally
  const patched = JSON.parse(
    JSON.stringify(rawIdl).replace(/:"publicKey"/g, ':"pubkey"')
  );

  // Step 2 — convert instruction account descriptors
  function fixIxAccounts(accounts: any[]): any[] {
    return accounts.map((acc: any) => {
      if (Array.isArray(acc.accounts)) {
        return { name: acc.name, accounts: fixIxAccounts(acc.accounts) };
      }
      const out: any = { name: acc.name };
      if (acc.isMut    || acc.writable) out.writable = true;
      if (acc.isSigner || acc.signer)   out.signer   = true;
      if (acc.optional || acc.isOptional) out.optional  = true;
      if (acc.address)                  out.address   = acc.address;
      if (acc.pda)                      out.pda       = acc.pda;
      if (acc.relations)                out.relations = acc.relations;
      return out;
    });
  }
  if (patched.instructions) {
    patched.instructions = patched.instructions.map((ix: any) => {
      const disc = ix.discriminator ?? IX_DISCRIMINATORS[ix.name] ?? [];
      if (typeof window !== 'undefined') {
        console.log(`[patchIdl] ix="${ix.name}" disc=${JSON.stringify(disc)}`);
      }
      return {
        ...ix,
        accounts: fixIxAccounts(ix.accounts ?? []),
        // Inject instruction discriminator — required by Anchor 0.32 BorshInstructionCoder
        discriminator: disc,
      };
    });
  }

  // Steps 3 & 4 — split old accounts[] into types[] + slim accounts[]
  // Old format: accounts[i] = { name, type: { kind:'struct', fields:[...] } }
  // New format: accounts[i] = { name, discriminator:[8 bytes] }
  //             types[i]    = { name, type: { kind:'struct', fields:[...] } }
  if (Array.isArray(patched.accounts) && patched.accounts.length > 0) {
    const oldAccounts: any[] = patched.accounts;
    const existingTypes: any[] = patched.types ?? [];

    const newTypes: any[] = [...existingTypes];
    const newAccounts: any[] = [];

    for (const acc of oldAccounts) {
      if (acc.type) {
        // Old format — extract struct def into types[]
        newTypes.push({ name: acc.name, type: acc.type });
        newAccounts.push({
          name: acc.name,
          discriminator: ACCOUNT_DISCRIMINATORS[acc.name] ?? [0,0,0,0,0,0,0,0],
        });
      } else {
        // Already new format — keep as-is, just ensure discriminator exists
        newAccounts.push({
          ...acc,
          discriminator: acc.discriminator ?? ACCOUNT_DISCRIMINATORS[acc.name] ?? [0,0,0,0,0,0,0,0],
        });
        if (!existingTypes.find((t: any) => t.name === acc.name)) {
          // No type entry yet — skip (won't be decodable but won't crash)
        }
      }
    }

    patched.accounts = newAccounts;
    patched.types    = newTypes;
  }

  // Step 5 — inject program address
  patched.address = programAddress;
  return patched;
}

function getProgramId(): PublicKey {
  const addr = NETWORK_CONFIG.solana.contractAddress;
  if (!addr) throw new Error('Solana program ID not configured. Set NEXT_PUBLIC_SOLANA_PROGRAM_ID in your .env.local');
  return new PublicKey(addr);
}
const DECIMALS   = 6;
const SCALE      = 10 ** DECIMALS;

// Referral commission percentages in BPS — mirrors the contract's REFERRAL_PERCENTAGES.
// Index 0 = Level 1 (direct), index 9 = Level 10.
const REFERRAL_BPS = [25, 50, 125, 150, 200, 325, 350, 425, 550, 800] as const;

// Cache for program.account.userAccount.all() — expires after 2 minutes.
// Shared across all callers (bfsReferralTree + solanaGetReferralInfo) so a
// burst of concurrent polls only hits the RPC once.
let _allUserAccountsCache: { data: any[]; ts: number } | null = null;
const ALL_ACCOUNTS_CACHE_MS = 120_000;
let _allUserAccountsInflight: Promise<any[]> | null = null;

async function getAllUserAccounts(): Promise<any[]> {
  const now = Date.now();
  if (_allUserAccountsCache && now - _allUserAccountsCache.ts < ALL_ACCOUNTS_CACHE_MS) {
    return _allUserAccountsCache.data;
  }
  // Deduplicate concurrent fetches — if one is already in flight, wait for it.
  if (_allUserAccountsInflight) return _allUserAccountsInflight;
  const program = getReadOnlyProgram();
  const inflight: Promise<any[]> = (program.account as any).userAccount.all().then((data: any[]) => {
    _allUserAccountsCache = { data, ts: Date.now() };
    _allUserAccountsInflight = null;
    return data;
  }).catch((err: unknown) => {
    _allUserAccountsInflight = null;
    throw err;
  });
  _allUserAccountsInflight = inflight;
  return inflight;
}

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
 * Returns the Reown-connected Solana wallet provider.
 *
 * Priority:
 * 1. AppKit subscribeProviders result — covers WalletConnect wallets (Binance, etc.)
 *    and browser-extension wallets routed through AppKit (Phantom, Solflare).
 * 2. Window-injected extension whose publicKey matches the connected address —
 *    covers Phantom/Solflare when AppKit provider isn't yet available.
 * 3. Any connected window extension (legacy fallback, no AppKit).
 */
function getSolanaWallet(): any {
  if (appKitModal) {
    // Layer 1: provider from AppKit (WalletConnect wallets like Binance, or Phantom via AppKit)
    if (solanaWalletProvider?.publicKey) return solanaWalletProvider;

    // Layer 2: browser extension whose address matches the Reown-connected address
    // (handles Phantom/Solflare connected via AppKit before subscribeProviders fires)
    if (connectedSolanaAddress) {
      const w = (window as any);
      const candidates = [w.solana, w.solflare, w.backpack, w.jupiter];
      const matched = candidates.find(
        c => c?.isConnected && c?.publicKey &&
             c.publicKey.toString() === connectedSolanaAddress
      );
      if (matched) return matched;
    }

    throw new Error(
      'Solana wallet not connected. To use Solana staking with Binance Wallet: ' +
      'open the connect modal, select Binance, then choose your Solana account in the Binance app.'
    );
  }
  // Layer 3: no AppKit — any connected window extension (legacy)
  const w = (window as any);
  const candidates = [w.solana, w.solflare, w.backpack, w.jupiter];
  const wallet = candidates.find(c => c?.isConnected && c?.publicKey);
  if (!wallet?.publicKey) throw new Error('Solana wallet not connected.');
  return wallet;
}

function getProvider(): AnchorProvider {
  const wallet = getSolanaWallet();
  const connection = getRpcConnection();
  // Re-wrap publicKey using our local @solana/web3.js PublicKey so Anchor 0.32's
  // internal isPubkey()/_bn check doesn't fail on Phantom's bundled version.
  const anchorWallet = {
    publicKey: new PublicKey(wallet.publicKey.toBytes()),
    signTransaction: (tx: any) => wallet.signTransaction(tx),
    signAllTransactions: (txs: any[]) => wallet.signAllTransactions(txs),
  };
  return new AnchorProvider(connection, anchorWallet as any, { commitment: 'confirmed' });
}

function getProgram(): Program {
  const idl = patchIdl(IDL, getProgramId().toBase58());
  return new (Program as any)(idl, getProvider()) as Program;
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

/**
 * Initialize the Platform PDA — must be called ONCE by admin before any other
 * instruction (depositReserve, stake, etc.) can work. Creates the on-chain
 * Platform account that all other instructions reference.
 */
export async function solanaInitializePlatform(
  rewardRate        = 100,
  referralRewardRate = 500
): Promise<{ txHash: string }> {
  const program   = getProgram();
  const authority = getOwner();
  const [platPda] = platformPda();

  const rewardTokenMint = new PublicKey(NETWORK_CONFIG.solana.rewardTokenAddress);
  const stakeTokenMint  = new PublicKey(NETWORK_CONFIG.solana.stakeTokenAddress);

  console.log('[initializePlatform] accounts:', {
    platform:       platPda.toBase58(),
    authority:      authority.toBase58(),
    rewardTokenMint: rewardTokenMint.toBase58(),
    stakeTokenMint:  stakeTokenMint.toBase58(),
  });

  const tx = await (program.methods as any)
    .initialize(new BN(rewardRate), new BN(referralRewardRate))
    .accounts({
      platform:       platPda,
      authority,
      rewardTokenMint,
      stakeTokenMint,
      systemProgram:  SystemProgram.programId,
      tokenProgram:   TOKEN_PROGRAM_ID,
      rent:           SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  return { txHash: tx };
}

/**
 * Returns true if the Platform PDA exists on-chain (initialize was called).
 * Returns false if the program is deployed but not yet initialized.
 */
export async function solanaIsPlatformInitialized(): Promise<boolean> {
  try {
    const program = getReadOnlyProgram();
    const [pda]   = platformPda();
    console.log('[isPlatformInitialized] fetching PDA:', pda.toBase58());
    const result = await (program.account as any).platform.fetch(pda);
    console.log('[isPlatformInitialized] fetch OK → true, bump=', result.bump?.toString?.() ?? result.bump);
    return true;
  } catch (err: any) {
    console.warn('[isPlatformInitialized] fetch FAILED → false:', err?.message ?? err);
    return false;
  }
}

export async function solanaFetchPlatformStats(): Promise<PlatformStats | null> {
  try {
    const program = getReadOnlyProgram();
    const [pda] = platformPda();
    const platform: any = await (program.account as any).platform.fetch(pda);

    const totalStaked = fromLamports(platform.totalStaked);

    // Live dynamic APY: annualEmission / totalStaked × 10000 (bps), same formula as on-chain.
    // Falls back to baseApy[0] when emission is zero (admin hasn't funded yet).
    let effectiveAPY = platform.baseApy
      ? Math.min(30_000, Math.max(1_000, Number(platform.baseApy[0])))
      : 1_000;
    if (platform.annualEmission && platform.totalStaked) {
      const emBN = new BN(platform.annualEmission.toString());
      const stBN = new BN(platform.totalStaked.toString());
      if (emBN.gtn(0) && stBN.gtn(0)) {
        const raw = emBN.muln(10_000).div(stBN).toNumber();
        effectiveAPY = Math.min(30_000, Math.max(1_000, raw));
      }
    }
    const halvingEpoch     = platform.halvingEpoch     ? Number(platform.halvingEpoch)     : 0;
    const halvingStartTime = platform.halvingStartTime ? Number(platform.halvingStartTime) : 0;

    const annualEmission        = platform.annualEmission        ? fromLamports(platform.annualEmission)        : 0;
    const burnBps               = platform.burnBps               ? Number(platform.burnBps)                     : 0;
    const totalReserve          = platform.totalReserve          ? fromLamports(platform.totalReserve)          : 0;
    const totalEmissionReleased = platform.totalEmissionReleased ? fromLamports(platform.totalEmissionReleased) : 0;
    const emissionStartTime     = platform.emissionStartTime     ? Number(platform.emissionStartTime)           : 0;

    // Calculate releasable emission: proportional to elapsed time since emission start
    let releasableEmission = 0;
    if (annualEmission > 0 && emissionStartTime > 0 && totalReserve > 0) {
      const now          = Math.floor(Date.now() / 1000);
      const elapsed      = Math.max(0, now - emissionStartTime);
      const secondsYear  = 365 * 24 * 3600;
      const released     = annualEmission * (elapsed / secondsYear);
      releasableEmission = Math.max(0, Math.min(totalReserve, released - totalEmissionReleased));
    }

    // Build on-chain team tier config — merges static labels/colors with live minStaked/bonusBps
    const { TEAM_TARGET_TIERS: STATIC_TIERS } = await import('@/types');
    let teamTiers: import('@/types').PlatformStats['teamTiers'] = undefined;
    if (platform.teamTierMinStaked && platform.teamTierBonusBps) {
      teamTiers = STATIC_TIERS.map((t, i) => {
        const rawMin = platform.teamTierMinStaked[i];
        const rawBps = platform.teamTierBonusBps[i];
        const minTeamStaked = rawMin != null ? fromLamports(rawMin) : t.minTeamStaked;
        const bonusBps      = rawBps != null ? Number(rawBps)       : t.bonusBps;
        return { tier: t.tier, label: t.label, color: t.color, minTeamStaked, bonusBps, bonusPercentage: bonusBps / 100 };
      });
    }

    return {
      totalStaked,
      totalUsers:            platform.totalUsers ? Number(platform.totalUsers.toString()) : 0,
      rewardPoolBalance:     fromLamports(platform.rewardPoolBalance),
      rewardRate:            platform.rewardRate ? Number(platform.rewardRate.toString()) : 0,
      referralRewardRate:    platform.referralRewardRate ? Number(platform.referralRewardRate.toString()) : 0,
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
      teamTiers,
      referralPercentages: Array.isArray((platform as any).referralPercentages)
        ? (platform as any).referralPercentages.map((v: any) => Number(v.toString()))
        : undefined,
    };
  } catch {
    return null;
  }
}

export async function solanaIsRegistered(owner: PublicKey): Promise<boolean> {
  try {
    const program = getReadOnlyProgram();
    const [pda] = userPda(owner);
    await (program.account as any).userAccount.fetch(pda);
    return true;
  } catch (err: any) {
    const msg = String(err?.message ?? '');
    // "Account does not exist" = PDA not initialized → user not registered
    if (msg.includes('does not exist') || msg.includes('has no data') || msg.includes('Account not found')) {
      return false;
    }
    // Any other error (network, RPC timeout) — rethrow so callers don't silently re-register
    throw err;
  }
}

export async function solanaRegisterUser(referrer?: string): Promise<{ txHash: string }> {
  const wallet    = getSolanaWallet();
  const program   = getProgram();
  const owner     = getOwner();
  const [platPda] = platformPda();
  const [userAccPda] = userPda(owner);
  const programId = getProgramId();

  let referrerPubkey: PublicKey | null = null;

  if (referrer) {
    try {
      referrerPubkey = new PublicKey(referrer);
      if (referrerPubkey.equals(owner)) throw new Error('Cannot use your own wallet as referrer.');
      const referrerRegistered = await solanaIsRegistered(referrerPubkey);
      if (!referrerRegistered) {
        throw new Error('Referrer wallet is not yet registered on the platform. Please use a valid referral link.');
      }
    } catch (err: any) {
      throw err;
    }
  } else {
    // No referrer — only admin can register without one.
    // Rethrow all errors so a network failure never silently allows non-admin
    // registration without a referrer.
    const platformData: any = await (program.account as any).platform.fetch(platPda);
    const isAdmin = owner.equals(new PublicKey(platformData.authority.toString()));
    if (!isAdmin) {
      throw new Error('A referral link is required to register. Please open the site from a valid referral link.');
    }
  }

  // Build instruction manually — Anchor 0.32 client issues; program has 4 fixed accounts.
  const disc = Buffer.from(IX_DISCRIMINATORS.registerUser);
  // Borsh encode referrer: Option<Pubkey> → [0] for None, [1, ...32 bytes] for Some
  const refArg = referrerPubkey
    ? Buffer.concat([Buffer.from([1]), Buffer.from(referrerPubkey.toBytes())])
    : Buffer.from([0]);
  const data = Buffer.concat([disc, refArg]);

  const keys = [
    { pubkey: platPda,                 isSigner: false, isWritable: true  },
    { pubkey: userAccPda,              isSigner: false, isWritable: true  },
    { pubkey: owner,                   isSigner: true,  isWritable: true  },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ keys, programId, data });

  const connection = getRpcConnection();
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const legacyTx = new Transaction({ feePayer: owner, recentBlockhash: blockhash });
  legacyTx.add(instruction);

  const signedTx = await wallet.signTransaction(legacyTx);
  const txHash = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });
  await connection.confirmTransaction({ signature: txHash, blockhash, lastValidBlockHeight }, 'confirmed');

  return { txHash };
}

export async function solanaStake(
  amount: number,
  referrer?: string
): Promise<{ txHash: string; stakedAt: number }> {
  if (!amount || amount < 1) throw new Error('Minimum stake is 1 FBiT.');
  const program  = getProgram();
  const owner    = getOwner();
  const [platPda] = platformPda();
  const [userAccPda] = userPda(owner);

  // Auto-register
  const registered = await solanaIsRegistered(owner);
  if (!registered) {
    await solanaRegisterUser(referrer);
  }

  // stakeId = UserAccount.stakeCount (monotonic counter, incremented by contract on each stake).
  const stakeMint    = new PublicKey(NETWORK_CONFIG.solana.stakeTokenAddress);
  const rewardMint   = new PublicKey(NETWORK_CONFIG.solana.rewardTokenAddress);
  const userTokenAcc = ata(stakeMint, owner);
  const stakeVault   = getStakeVault();
  const rewardVault  = getRewardVault();

  let stakeId = 0;
  let adminStakeAccount = ata(stakeMint, owner); // fallback
  try {
    const userAccData: any = await (program.account as any).userAccount.fetch(userAccPda);
    stakeId = userAccData.stakeCount ? userAccData.stakeCount.toNumber() : 0;
  } catch {}

  // Get platform authority for adminStakeAccount
  try {
    const [pda] = platformPda();
    const platformData: any = await (program.account as any).platform.fetch(pda);
    const authorityKey = new PublicKey(platformData.authority.toString());
    adminStakeAccount = ata(stakeMint, authorityKey);
  } catch {}

  const [stakeEntryAccPda] = stakeEntryPda(owner, stakeId);

  // Build remaining_accounts: walk the referral chain up to 10 levels.
  // Each level contributes 2 accounts: [UserAccount PDA (writable), reward ATA (writable)].
  // ATAs are always canonically derived via ata(rewardMint, referrerPubkey) — never user-supplied.
  const remainingAccounts: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[] = [];
  try {
    // The staker's own account already has referrer stored on-chain (set during registerUser).
    const userAccData: any = await (program.account as any).userAccount.fetch(userAccPda);
    let currentReferrerKey: PublicKey | null = userAccData.referrer
      ? new PublicKey(userAccData.referrer.toString())
      : null;

    // Cycle detection: track seen pubkeys to prevent infinite loops in corrupted chains
    const seenKeys = new Set<string>([owner.toBase58()]);

    for (let lvl = 0; lvl < 10 && currentReferrerKey !== null; lvl++) {
      const keyStr = currentReferrerKey.toBase58();
      if (seenKeys.has(keyStr)) break; // cycle detected — stop walking
      seenKeys.add(keyStr);

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

// Returns a releaseEmission TransactionInstruction if the reserve has ≥1 FBiT
// ready to release right now, otherwise null. Accepts already-fetched platform
// data to avoid an extra RPC call (pass null to fetch internally as fallback).
async function buildReleaseIxIfReady(program: any, platformData?: any): Promise<import('@solana/web3.js').TransactionInstruction | null> {
  try {
    const [platPda] = platformPda();
    const platform: any = platformData ?? await (program.account as any).platform.fetch(platPda);
    const annual    = platform.annualEmission  ? Number(new BN(platform.annualEmission.toString()))  : 0;
    const reserve   = platform.totalReserve    ? Number(new BN(platform.totalReserve.toString()))    : 0;
    const released  = platform.totalEmissionReleased ? Number(new BN(platform.totalEmissionReleased.toString())) : 0;
    const start     = platform.emissionStartTime ? Number(platform.emissionStartTime) : 0;
    if (annual === 0 || reserve === 0 || start === 0) return null;
    const elapsed    = Math.max(0, Math.floor(Date.now() / 1000) - start);
    const accrued    = annual * (elapsed / (365 * 24 * 3600));
    const releasable = Math.max(0, Math.min(reserve, accrued - released));
    if (releasable < SCALE) return null;
    return await (program.methods as any)
      .releaseEmission()
      .accounts({
        platform:     platPda,
        reserveVault: getReserveVault(),
        rewardVault:  getRewardVault(),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
  } catch {
    return null;
  }
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

  // Read pending reward using live APY (dynamic PoS — not locked at stake time)
  let reward = 0;
  try {
    const [pda] = platformPda();
    const [entry, platform]: [any, any] = await Promise.all([
      (program.account as any).stakeEntry.fetch(stakeEntryAccPda),
      (program.account as any).platform.fetch(pda),
    ]);
    const now = Math.floor(Date.now() / 1000);
    const intervals = Math.floor((now - entry.lastClaimAt.toNumber()) / 21600);
    // Live dynamic APY = emission / totalStaked (same as contract)
    let liveApy = 1_000;
    if (platform.annualEmission && platform.totalStaked) {
      const emBN = new BN(platform.annualEmission.toString());
      const stBN = new BN(platform.totalStaked.toString());
      if (emBN.gtn(0) && stBN.gtn(0)) {
        const raw = emBN.muln(10_000).div(stBN).toNumber();
        liveApy = Math.min(30_000, Math.max(1_000, raw));
      } else {
        liveApy = Math.min(30_000, Math.max(1_000,
          platform.baseApy ? Number(platform.baseApy[0]) : 1_000
        ));
      }
    }
    reward = fromLamports(entry.amount) * liveApy * intervals / (1460 * 10_000);
  } catch {}

  const rewardMint = new PublicKey(NETWORK_CONFIG.solana.rewardTokenAddress);
  const userTokenAcc = ata(rewardMint, owner);
  const rewardVault  = getRewardVault();

  // Fetch platform to check renounced state and get fee_recipient
  const [pda] = platformPda();
  let adminRewardAccount = userTokenAcc; // fallback: pass user's ATA (unused when renounced)
  let feeRecipientTokenAccount = userTokenAcc; // fallback (unused when NOT renounced)
  let fetchedPlatform: any = null;
  try {
    fetchedPlatform = await (program.account as any).platform.fetch(pda);
    if (fetchedPlatform.isRenounced && fetchedPlatform.feeRecipient) {
      const feeRecipientKey = new PublicKey(fetchedPlatform.feeRecipient.toString());
      feeRecipientTokenAccount = ata(rewardMint, feeRecipientKey);
      adminRewardAccount       = feeRecipientTokenAccount;
    } else {
      const authorityKey = new PublicKey(fetchedPlatform.authority.toString());
      adminRewardAccount = ata(rewardMint, authorityKey);
    }
  } catch {}

  // Bundle releaseEmission as a pre-instruction so reward pool is topped up
  // in the same transaction — no extra wallet popup needed.
  // Pass already-fetched platform to avoid an extra RPC call that could fail silently.
  const releaseIx = await buildReleaseIxIfReady(program, fetchedPlatform);

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
    .preInstructions(releaseIx ? [releaseIx] : [])
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
    const [entry, platform]: [any, any] = await Promise.all([
      (program.account as any).stakeEntry.fetch(stakeEntryAccPda),
      (program.account as any).platform.fetch(platPda),
    ]);
    const now = Math.floor(Date.now() / 1000);
    const intervals = Math.floor((now - entry.lastClaimAt.toNumber()) / 21600);
    let liveApy = 1_000;
    if (platform.annualEmission && platform.totalStaked) {
      const emBN = new BN(platform.annualEmission.toString());
      const stBN = new BN(platform.totalStaked.toString());
      if (emBN.gtn(0) && stBN.gtn(0)) {
        const raw = emBN.muln(10_000).div(stBN).toNumber();
        liveApy = Math.min(30_000, Math.max(1_000, raw));
      } else {
        liveApy = Math.min(30_000, Math.max(1_000,
          platform.baseApy ? Number(platform.baseApy[0]) : 1_000
        ));
      }
    }
    reward = fromLamports(entry.amount) * liveApy * intervals / (1460 * 10_000);
  } catch {}

  const rewardMint  = new PublicKey(NETWORK_CONFIG.solana.rewardTokenAddress);
  const rewardVault = getRewardVault();

  // Resolve admin/fee-recipient accounts based on renounce state
  const [pda] = platformPda();
  let adminRewardAccount        = ata(rewardMint, owner); // fallback
  let feeRecipientTokenAccount  = ata(rewardMint, owner); // fallback
  let fetchedPlatform: any = null;
  try {
    fetchedPlatform = await (program.account as any).platform.fetch(pda);
    if (fetchedPlatform.isRenounced && fetchedPlatform.feeRecipient) {
      const feeRecipientKey = new PublicKey(fetchedPlatform.feeRecipient.toString());
      feeRecipientTokenAccount = ata(rewardMint, feeRecipientKey);
      adminRewardAccount       = feeRecipientTokenAccount;
    } else {
      const authorityKey = new PublicKey(fetchedPlatform.authority.toString());
      adminRewardAccount = ata(rewardMint, authorityKey);
    }
  } catch {}

  // Pass already-fetched platform to avoid an extra RPC call that could fail silently.
  const releaseIx = await buildReleaseIxIfReady(program, fetchedPlatform);

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
    .preInstructions(releaseIx ? [releaseIx] : [])
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

  // Pre-flight: check unlock_at before broadcasting
  try {
    const entryData: any = await (program.account as any).stakeEntry.fetch(stakeEntryAccPda);
    const unlockAt = Number(entryData.unlockAt);
    const now = Math.floor(Date.now() / 1000);
    if (unlockAt > now) {
      const secsLeft = unlockAt - now;
      const daysLeft = Math.ceil(secsLeft / 86400);
      const unlockDate = new Date(unlockAt * 1000).toLocaleDateString();
      throw new Error(`Stake is still locked. Unlocks in ${daysLeft} day(s) on ${unlockDate}.`);
    }
  } catch (e: any) {
    if (e.message?.includes('locked')) throw e;
    // If account fetch fails, let the contract handle it
  }

  // adminStakeAccount = authority's stake token ATA
  let adminStakeAccount = ata(stakeMint, owner); // fallback
  try {
    const platformData: any = await (program.account as any).platform.fetch(platPda);
    const authorityKey = new PublicKey(platformData.authority.toString());
    adminStakeAccount = ata(stakeMint, authorityKey);
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
  if (amount < 1) throw new Error('Minimum refund is 1 FBiT');
  const program   = getProgram();
  const authority = getOwner();
  const [platPda] = platformPda();

  const rewardMint          = new PublicKey(NETWORK_CONFIG.solana.rewardTokenAddress);
  const authorityTokenAccount = ata(rewardMint, authority);
  const rewardVault         = getRewardVault();

  const tx = await (program.methods as any)
    .refundRewardPool(toLamports(amount))
    .accounts({
      platform:               platPda,
      authority,
      authorityTokenAccount,
      rewardVault,
      tokenProgram:           TOKEN_PROGRAM_ID,
    })
    .rpc();

  return { txHash: tx };
}

/**
 * One-time fix for deployments where initialize() forgot to store platform.bump.
 * Calls fix_bump instruction which sets platform.bump = ctx.bumps.platform (canonical 253).
 * After this, all instructions that use bump = platform.bump will work correctly.
 * Safe to call multiple times — only changes bump if it is wrong.
 */
export async function solanaFixBump(): Promise<{ txHash: string }> {
  const wallet    = getSolanaWallet();
  const authority = getOwner();
  const [platPda] = platformPda();
  const programId = getProgramId();

  const disc = Buffer.from(IX_DISCRIMINATORS.fixBump);

  const keys = [
    { pubkey: platPda,   isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: true,  isWritable: false },
  ];

  const instruction = new TransactionInstruction({ keys, programId, data: disc });

  const connection = getRpcConnection();
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const legacyTx = new Transaction({ feePayer: authority, recentBlockhash: blockhash });
  legacyTx.add(instruction);

  const signedTx = await wallet.signTransaction(legacyTx);

  let txHash: string;
  try {
    txHash = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
  } catch (sendErr: any) {
    console.error('[fixBump] sendRawTransaction error:', sendErr?.message ?? sendErr);
    if (sendErr?.logs) console.error('[fixBump] simulation logs:', sendErr.logs);
    throw sendErr;
  }

  await connection.confirmTransaction({ signature: txHash, blockhash, lastValidBlockHeight }, 'confirmed');
  return { txHash };
}

export async function solanaDepositReserve(amount: number): Promise<{ txHash: string }> {
  if (amount < 1) throw new Error('Minimum deposit is 1 FBiT');

  const wallet     = getSolanaWallet();
  const authority  = getOwner();
  const [platPda]  = platformPda();
  const programId  = getProgramId();

  const rewardMint         = new PublicKey(NETWORK_CONFIG.solana.rewardTokenAddress);
  const funderTokenAccount = ata(rewardMint, authority);
  const reserveVault       = getReserveVault();

  // Diagnostic: scan raw Platform account bytes for embedded Pubkeys.
  // This reveals whether the program stores reserve_vault / reward_vault etc. in the Platform struct.
  try {
    const conn     = getRpcConnection();
    const platInfo = await conn.getAccountInfo(platPda);
    if (platInfo) {
      const bytes = platInfo.data;
      console.log('[depositReserve] Platform raw bytes len:', bytes.length);
      const knownKeys: Record<string, string> = {
        [authority.toBase58()]:                'admin_authority',
        [rewardMint.toBase58()]:               'fbit_mint',
        [reserveVault.toBase58()]:             'env_reserve_vault',
        [ata(rewardMint, platPda).toBase58()]: 'std_ata(fbit,platPda)',
        [funderTokenAccount.toBase58()]:       'funder_ata',
      };
      for (let off = 8; off + 32 <= bytes.length; off++) {
        try {
          const key = new PublicKey(Uint8Array.from(bytes.subarray(off, off + 32))).toBase58();
          if (knownKeys[key]) console.log(`[depositReserve] Platform[${off}] = ${knownKeys[key]}`);
        } catch { /* skip invalid pubkey bytes */ }
      }
    }
  } catch (diagErr) {
    console.warn('[depositReserve] diagnostic scan error:', diagErr);
  }

  // Build instruction manually (bypassing Anchor 0.32 client entirely).
  // disc = sha256("global:deposit_reserve")[0..8]
  const disc      = Buffer.from([187, 75, 224, 96, 122, 233, 220, 121]);
  const amountBuf = toLamports(amount).toArrayLike(Buffer, 'le', 8);
  const instrData = Buffer.concat([disc, amountBuf]);

  const keys = [
    { pubkey: platPda,             isSigner: false, isWritable: true  },
    { pubkey: authority,           isSigner: true,  isWritable: true  },
    { pubkey: funderTokenAccount,  isSigner: false, isWritable: true  },
    { pubkey: reserveVault,        isSigner: false, isWritable: true  },
    { pubkey: TOKEN_PROGRAM_ID,    isSigner: false, isWritable: false },
  ];

  console.log('[depositReserve] RAW tx accounts:', {
    platform:           platPda.toBase58(),
    authority:          authority.toBase58(),
    funderTokenAccount: funderTokenAccount.toBase58(),
    reserveVault:       reserveVault.toBase58(),
    tokenProgram:       TOKEN_PROGRAM_ID.toBase58(),
    amountLamports:     toLamports(amount).toString(),
    disc:               Array.from(disc),
  });

  const instruction = new TransactionInstruction({ keys, programId, data: instrData });

  const connection = getRpcConnection();
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const legacyTx = new Transaction({ feePayer: authority, recentBlockhash: blockhash });
  legacyTx.add(instruction);

  const signedTx = await wallet.signTransaction(legacyTx);

  let txHash: string;
  try {
    txHash = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
  } catch (sendErr: any) {
    // Surface simulation logs so the exact on-chain error is visible in the console
    console.error('[depositReserve] sendRawTransaction error:', sendErr?.message ?? sendErr);
    if (sendErr?.logs) console.error('[depositReserve] simulation logs:', sendErr.logs);
    throw sendErr;
  }

  await connection.confirmTransaction({ signature: txHash, blockhash, lastValidBlockHeight }, 'confirmed');
  return { txHash };
}

export async function solanaReleaseEmission(): Promise<{ txHash: string }> {
  const program   = getProgram();
  const [platPda] = platformPda();

  // Pre-check: verify that emission is actually available before spending SOL on tx fees.
  // Mirrors the on-chain releasable = min(reserve, accrued - released) calculation.
  try {
    const platform: any = await (program.account as any).platform.fetch(platPda);
    const annualEmission = platform.annualEmission ? new BN(platform.annualEmission.toString()).toNumber() : 0;
    const totalReserve   = platform.totalReserve   ? new BN(platform.totalReserve.toString()).toNumber()   : 0;
    if (annualEmission === 0) throw new Error('Annual emission is not configured yet. Set annual emission first.');
    if (totalReserve   === 0) throw new Error('Reserve vault is empty. Deposit tokens first.');
    const emissionStart    = platform.emissionStartTime ? Number(platform.emissionStartTime) : 0;
    const totalReleased    = platform.totalEmissionReleased ? new BN(platform.totalEmissionReleased.toString()).toNumber() : 0;
    if (emissionStart > 0) {
      const elapsed    = Math.max(0, Math.floor(Date.now() / 1000) - emissionStart);
      const accrued    = annualEmission * (elapsed / (365 * 24 * 3600));
      const releasable = Math.max(0, Math.min(totalReserve, accrued - totalReleased));
      if (releasable < SCALE) throw new Error('No emission available to release yet — wait for more time to accrue.');
    }
  } catch (err: any) {
    // Only block when we computed "nothing to release"; let other errors through (RPC issues etc.)
    if (err?.message?.includes('emission') || err?.message?.includes('Reserve') || err?.message?.includes('No emission')) throw err;
  }

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

export async function solanaSetReferralPercentages(
  percentages: [number, number, number, number, number, number, number, number, number, number]
): Promise<{ txHash: string }> {
  const program   = getProgram();
  const owner     = getOwner();
  const [platPda] = platformPda();
  const bpsValues = percentages.map((p) => new BN(p));
  const tx = await (program.methods as any).setReferralPercentages(bpsValues)
    .accounts({ platform: platPda, authority: owner }).rpc();
  return { txHash: tx };
}

export async function solanaBlockUser(userAddress: string): Promise<{ txHash: string }> {
  let targetKey: PublicKey;
  try { targetKey = new PublicKey(userAddress); } catch { throw new Error('Invalid Solana address'); }
  const program  = getProgram();
  const owner    = getOwner();
  const [platPda] = platformPda();
  const [targetPda] = userPda(targetKey);
  const tx = await (program.methods as any).blockUser()
    .accounts({ platform: platPda, userAccount: targetPda, authority: owner }).rpc();
  return { txHash: tx };
}

export async function solanaUnblockUser(userAddress: string): Promise<{ txHash: string }> {
  let targetKey: PublicKey;
  try { targetKey = new PublicKey(userAddress); } catch { throw new Error('Invalid Solana address'); }
  const program  = getProgram();
  const owner    = getOwner();
  const [platPda] = platformPda();
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
  const program   = getProgram();
  const authority = getOwner();
  const [platPda] = platformPda();
  const tx = await (program.methods as any)
    .setAnnualEmission(toLamports(annualEmission))
    .accounts({ platform: platPda, authority })
    .rpc();
  return { txHash: tx };
}

export async function solanaSetBurnBps(burnBps: number): Promise<{ txHash: string }> {
  if (burnBps > 5000) throw new Error('burnBps exceeds maximum (5000 = 50%)');
  const program   = getProgram();
  const authority = getOwner();
  const [platPda] = platformPda();
  const tx = await (program.methods as any)
    .setBurnBps(new BN(burnBps))
    .accounts({ platform: platPda, authority })
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
  if (apyBps < 1_000 || apyBps > 30_000) throw new Error('Base APY must be 1000–30000 BPS (10%–300%)');
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
// Helius is preferred when configured; falls back to Solana Foundation mainnet-beta.
const READ_RPC = 'https://solana-rpc.publicnode.com';

// Concurrency limiter — prevents 429s on the Helius free tier (10 RPS cap).
// Queues excess requests rather than firing them simultaneously.
const _RPC_MAX = 5;
let _rpcInFlight = 0;
const _rpcQueue: Array<() => void> = [];

function rpcFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const run = (): void => {
      _rpcInFlight++;
      fetch(input, init)
        .then(resolve, reject)
        .finally(() => { _rpcInFlight--; _rpcQueue.shift()?.(); });
    };
    _rpcInFlight < _RPC_MAX ? run() : _rpcQueue.push(run);
  });
}

function getRpcConnection(): Connection {
  return new Connection(READ_RPC, { commitment: 'confirmed', fetch: rpcFetch });
}

function getReadOnlyProgram(): Program {
  const connection = getRpcConnection();
  const noopWallet = {
    publicKey: new PublicKey('11111111111111111111111111111111'),
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };
  const provider = new AnchorProvider(connection, noopWallet as any, { commitment: 'confirmed' });
  const idl = patchIdl(IDL, getProgramId().toBase58());
  return new (Program as any)(idl, provider) as Program;
}

/**
 * Fetch all active StakeEntry accounts for a given owner.
 * Uses a memcmp filter on the owner field (offset 8, after discriminator).
 */
export async function solanaGetUserStakes(ownerAddress: string): Promise<StakeEntry[] | null> {
  try {
    const owner = new PublicKey(ownerAddress);
    const program = getReadOnlyProgram();
    // dataSize: 8(disc) + 32+8+1+8+8+8+8+1+8+8+1 = 99 — prevents Platform/UserAccount false matches
    const all = await (program.account as any).stakeEntry.all([
      { dataSize: 99 },
      { memcmp: { offset: 8, bytes: owner.toBase58() } },
    ]);
    return (all as any[])
      .filter((e: any) => e.account.isActive)
      .map((e: any): StakeEntry => {
        // stakeId field is now stored directly in StakeEntry
        const id = e.account.stakeId !== undefined ? e.account.stakeId.toNumber() : -1;
        const stakedAt = e.account.stakedAt.toNumber();
        return {
          id:              id >= 0 ? id : stakedAt,
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
    return null;
  }
}

// Raw JSON-RPC helper — bypasses @solana/web3.js Connection to avoid URL
// manipulation issues with the Next.js dev proxy (trailingSlash redirect).
// 8-second timeout per endpoint so a hanging gateway (e.g. 504) doesn't block the fallback chain.
async function rpcCall(endpoint: string, method: string, params: unknown[]): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await rpcFetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal:  controller.signal,
    });
    if (!res.ok) throw new Error(`RPC ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message ?? 'RPC error');
    return json.result;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch the FBiT SPL token balance for a wallet address.
 *
 * Strategy: compute the Associated Token Account (ATA) directly and call
 * getTokenAccountBalance — a single targeted lookup that is faster and less
 * rate-limited than a full getTokenAccountsByOwner scan.
 * Falls back through multiple RPC endpoints with an 8 s timeout each.
 * Returns 0 if the wallet has no ATA for this mint or all endpoints fail.
 */
export async function solanaGetTokenBalance(ownerAddress: string): Promise<number> {
  if (!ownerAddress || ownerAddress.startsWith('0x')) return 0;
  const stakeTokenAddr = NETWORK_CONFIG.solana.stakeTokenAddress;
  if (!stakeTokenAddr || stakeTokenAddr.length < 10 || stakeTokenAddr.toUpperCase().startsWith('YOUR_')) return 0;

  let owner: PublicKey, mint: PublicKey;
  try {
    owner = new PublicKey(ownerAddress);
    mint  = new PublicKey(stakeTokenAddr);
  } catch { return 0; }

  // Derive ATA — deterministic, no RPC call needed
  const ataAddress = ata(mint, owner).toBase58();

  const endpoints = [
    READ_RPC,                               // publicnode (primary)
    'https://api.mainnet-beta.solana.com',  // Solana Foundation fallback
    NETWORK_CONFIG.solana.rpcUrl,           // custom RPC from env (deduped if same as above)
  ].filter((u, i, a) => u && a.indexOf(u) === i);

  for (const rpc of endpoints) {
    try {
      const result = await rpcCall(rpc, 'getTokenAccountBalance', [ataAddress]);
      // result.value.uiAmount is null if account has 0 balance; treat as 0
      return result?.value?.uiAmount ?? 0;
    } catch {
      // account not found or RPC error — try next endpoint
    }
  }
  return 0;
}

export async function solanaGetUserAccount(ownerAddress: string): Promise<UserAccount | null> {
  try {
    const program = getReadOnlyProgram();
    const owner = new PublicKey(ownerAddress);
    const [pda] = userPda(owner);
    const acc = await (program.account as any).userAccount.fetch(pda);
    const teamTotalStaked = acc.teamTotalStaked ? fromLamports(acc.teamTotalStaked) : 0;

    // Derive current team bonus tier from the on-chain platform data (teamTierMinStaked/teamTierBonusBps).
    // Falls back to the hardcoded TEAM_TARGET_TIERS constants when the platform fetch fails.
    let currentTierBonusBps = 0;
    try {
      const [platPda] = platformPda();
      const platform: any = await (getReadOnlyProgram().account as any).platform.fetch(platPda);
      if (platform.teamTierMinStaked && platform.teamTierBonusBps) {
        for (let i = platform.teamTierMinStaked.length - 1; i >= 0; i--) {
          if (platform.teamTierMinStaked[i] != null && teamTotalStaked >= fromLamports(platform.teamTierMinStaked[i])) {
            currentTierBonusBps = Number(platform.teamTierBonusBps[i]);
            break;
          }
        }
      } else {
        const { TEAM_TARGET_TIERS: tiers } = await import('@/types');
        for (let i = tiers.length - 1; i >= 0; i--) {
          if (teamTotalStaked >= tiers[i].minTeamStaked) { currentTierBonusBps = tiers[i].bonusBps; break; }
        }
      }
    } catch {
      const { TEAM_TARGET_TIERS: tiers } = await import('@/types');
      for (let i = tiers.length - 1; i >= 0; i--) {
        if (teamTotalStaked >= tiers[i].minTeamStaked) { currentTierBonusBps = tiers[i].bonusBps; break; }
      }
    }

    return {
      address:              ownerAddress,
      totalStaked:          fromLamports(acc.totalStaked),
      totalRewardsEarned:   fromLamports(acc.totalRewardsEarned),
      totalReferralRewards: fromLamports(acc.totalReferralRewards),
      referrer:             acc.referrer ? acc.referrer.toBase58() : null,
      referralCount:        acc.referralCount.toNumber(),
      teamSize:             acc.teamSize    ? acc.teamSize.toNumber()          : 0,
      teamTotalStaked,
      isBlocked:            acc.isBlocked,
      registeredAt:         acc.registeredAt.toNumber(),
      currentTierBonusBps,
    };
  } catch {
    return null;
  }
}

// Shared BFS helper: fetches all UserAccount PDAs once, builds a referrer→children
// map, then walks L1–L10 from ownerAddress. Returns all ReferralEntry records.
// liveBps: on-chain referral percentages in BPS — falls back to REFERRAL_BPS constants.
async function bfsReferralTree(ownerAddress: string, liveBps?: number[]): Promise<import('@/types').ReferralEntry[]> {
  const bpsArray = (liveBps && liveBps.length === 10) ? liveBps : [...REFERRAL_BPS];

  // Use cached/deduped fetch — avoids hammering RPC when multiple components poll.
  const allDecoded: any[] = await getAllUserAccounts();

  // Build referrerKey → [{address, staked, registeredAt}] map
  type ChildMeta = { address: string; staked: number; registeredAt: number };
  const referrerMap = new Map<string, ChildMeta[]>();

  for (const item of allDecoded) {
    try {
      const ref: PublicKey | null = item.account.referrer ?? null;
      if (!ref) continue;
      const referrerKey  = ref.toBase58();
      const ownerKey     = item.account.owner.toBase58();
      const staked       = fromLamports(item.account.totalStaked);
      const registeredAt = item.account.registeredAt?.toNumber?.() ?? 0;
      if (!referrerMap.has(referrerKey)) referrerMap.set(referrerKey, []);
      referrerMap.get(referrerKey)!.push({ address: ownerKey, staked, registeredAt });
    } catch { /* skip malformed */ }
  }

  // BFS from ownerAddress through up to 10 levels
  const result: import('@/types').ReferralEntry[] = [];
  const seen = new Set<string>([ownerAddress]);
  let currentLevel: string[] = [ownerAddress];

  for (let level = 1; level <= 10 && currentLevel.length > 0; level++) {
    const nextLevel: string[] = [];
    for (const parentKey of currentLevel) {
      for (const child of referrerMap.get(parentKey) ?? []) {
        if (seen.has(child.address)) continue;
        seen.add(child.address);
        nextLevel.push(child.address);
        result.push({
          address:      child.address,
          level,
          stakedAmount: child.staked,
          rewardEarned: child.staked * bpsArray[level - 1] / 10_000,
          registeredAt: child.registeredAt,
        });
      }
    }
    currentLevel = nextLevel;
  }

  return result;
}

export async function solanaGetReferralInfo(ownerAddress: string): Promise<ReferralInfo | null> {
  try {
    const program    = getReadOnlyProgram();
    const owner      = new PublicKey(ownerAddress);
    const [pda]      = userPda(owner);
    const acc        = await (program.account as any).userAccount.fetch(pda);
    const totalReferrals       = acc.referralCount.toNumber();
    const totalReferralRewards = fromLamports(acc.totalReferralRewards);

    // Fetch live referral percentages from platform — use for reward calculations
    // so the displayed rewards reflect admin-updated on-chain BPS values.
    let liveBps: number[] | undefined;
    try {
      const [platPda] = platformPda();
      const platform: any = await (program.account as any).platform.fetch(platPda);
      if (Array.isArray(platform.referralPercentages) && platform.referralPercentages.length === 10) {
        const parsed = platform.referralPercentages.map((v: any) => Number(v.toString()));
        if (parsed.some((v: number) => v > 0)) liveBps = parsed;
      }
    } catch { /* use fallback */ }

    // Fetch all UserAccount PDAs once via Anchor's own decoder — avoids hardcoded
    // byte offsets (the deployed account is 152 bytes; the IDL predicted 139).
    // Run BFS inline so the auto-poll already returns all L1–L10 levels.
    const connection = getRpcConnection();
    const programId  = getProgramId();
    let referrals: import('@/types').ReferralEntry[] = [];
    try {
      const allDecoded: any[] = await getAllUserAccounts();

      // Build referrerKey → [{address, staked, registeredAt}] map from decoded data
      type ChildMeta = { address: string; staked: number; registeredAt: number };
      const referrerMap = new Map<string, ChildMeta[]>();
      for (const item of allDecoded) {
        try {
          const ref: PublicKey | null = item.account.referrer ?? null;
          if (!ref) continue;
          const referrerKey  = ref.toBase58();
          const ownerKey     = item.account.owner.toBase58();
          const staked       = fromLamports(item.account.totalStaked);
          const registeredAt = item.account.registeredAt?.toNumber?.() ?? 0;
          if (!referrerMap.has(referrerKey)) referrerMap.set(referrerKey, []);
          referrerMap.get(referrerKey)!.push({ address: ownerKey, staked, registeredAt });
        } catch { /* skip */ }
      }

      // BFS from ownerAddress through up to 10 levels
      const seen = new Set<string>([ownerAddress]);
      let currentLevel: string[] = [ownerAddress];
      for (let level = 1; level <= 10 && currentLevel.length > 0; level++) {
        const nextLevel: string[] = [];
        for (const parentKey of currentLevel) {
          for (const child of referrerMap.get(parentKey) ?? []) {
            if (seen.has(child.address)) continue;
            seen.add(child.address);
            nextLevel.push(child.address);
            referrals.push({
              address:      child.address,
              level,
              stakedAmount: child.staked,
              rewardEarned: child.staked * (liveBps ? liveBps[level - 1] : REFERRAL_BPS[level - 1]) / 10_000,
              registeredAt: child.registeredAt,
            });
          }
        }
        currentLevel = nextLevel;
      }
    } catch {
      // Fallback: memcmp L1-only scan if Anchor all() fails
      const rawL1 = await connection.getProgramAccounts(programId, {
        filters: [{ memcmp: { offset: 65, bytes: owner.toBase58() } }],
      });
      const userAccDisc = Buffer.from(ACCOUNT_DISCRIMINATORS.UserAccount);
      referrals = rawL1.flatMap(({ account }) => {
        try {
          const raw = Buffer.from(account.data);
          if (!raw.subarray(0, 8).equals(userAccDisc)) return [];
          const slice = raw.subarray(8);
          const childKey     = new PublicKey(Uint8Array.from(slice.subarray(0, 32))).toBase58();
          const staked       = Number(slice.readBigUInt64LE(32)) / SCALE;
          const registeredAt = Number(slice.readBigInt64LE(98));
          return [{ address: childKey, level: 1, stakedAmount: staked, rewardEarned: 0, registeredAt }];
        } catch { return []; }
      });
    }

    // Direct referrals = L1 only; totalReferrals is the on-chain count or scan count
    const directCount = referrals.filter(r => r.level === 1).length;
    return {
      totalReferrals:       Math.max(totalReferrals, directCount),
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
 * Full multi-level referral tree for a wallet (L1–L10).
 * Uses a single getProgramAccounts call + BFS — no N+1 queries.
 */
export async function solanaGetFullReferralTree(ownerAddress: string): Promise<import('@/types').ReferralEntry[]> {
  let liveBps: number[] | undefined;
  try {
    const program = getReadOnlyProgram();
    const [platPda] = platformPda();
    const platform: any = await (program.account as any).platform.fetch(platPda);
    if (Array.isArray(platform.referralPercentages) && platform.referralPercentages.length === 10) {
      const parsed = platform.referralPercentages.map((v: any) => Number(v.toString()));
      if (parsed.some((v: number) => v > 0)) liveBps = parsed;
    }
  } catch { /* use fallback */ }
  return bfsReferralTree(ownerAddress, liveBps);
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

// Anchor logs instruction names as the CamelCase IDL name: "Instruction: ClaimRewards" etc.
const INSTRUCTION_TYPE_MAP: Record<string, import('@/types').TxRecord['type']> = {
  'Instruction: Stake':          'stake',
  'Instruction: ClaimRewards':   'claim',
  'Instruction: CompoundRewards': 'compound',
  'Instruction: Unstake':        'unstake',
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
    const connection = getRpcConnection();
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

          // Determine the token amount involved in this tx.
          let amount = 0;
          const preBalances  = tx.meta?.preTokenBalances  ?? [];
          const postBalances = tx.meta?.postTokenBalances ?? [];
          const stakeMint  = NETWORK_CONFIG.solana.stakeTokenAddress;
          const rewardMint = NETWORK_CONFIG.solana.rewardTokenAddress || stakeMint;

          if (type === 'stake' || type === 'unstake') {
            // Stake/unstake: user's stake-token wallet ATA changes
            const pre  = preBalances.find(b => b.mint === stakeMint && b.owner === address);
            const post = postBalances.find(b => b.mint === stakeMint && b.owner === address);
            amount = Math.abs((post?.uiTokenAmount?.uiAmount ?? 0) - (pre?.uiTokenAmount?.uiAmount ?? 0));
          } else if (type === 'claim') {
            // Claim: reward_vault → user's reward-token ATA.
            // Pre-balance may be missing (ATA created on first claim) — treat as 0.
            const pre  = preBalances.find(b => b.mint === rewardMint && b.owner === address);
            const post = postBalances.find(b => b.mint === rewardMint && b.owner === address);
            amount = Math.max(0, (post?.uiTokenAmount?.uiAmount ?? 0) - (pre?.uiTokenAmount?.uiAmount ?? 0));
            // If reward mint = stake mint and nothing found, try stake mint explicitly
            if (amount === 0 && rewardMint !== stakeMint) {
              const preS  = preBalances.find(b => b.mint === stakeMint && b.owner === address);
              const postS = postBalances.find(b => b.mint === stakeMint && b.owner === address);
              amount = Math.max(0, (postS?.uiTokenAmount?.uiAmount ?? 0) - (preS?.uiTokenAmount?.uiAmount ?? 0));
            }
          }
          // compound: no token reaches user wallet — amount stays 0;
          // the compound_amount is pure on-chain accounting (stake_entry.amount += compound_amount).

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

/**
 * Scan the user's UserAccount PDA for transactions where someone else staked
 * and our ATA received a referral reward payout.
 * Returns TxRecord[] of type 'referral', sorted newest-first.
 */
export async function solanaGetReferralOnChainHistory(
  address: string
): Promise<import('@/types').TxRecord[]> {
  const programAddr = NETWORK_CONFIG.solana.contractAddress;
  if (!programAddr || programAddr.toUpperCase().startsWith('YOUR_')) return [];
  const rewardMint = NETWORK_CONFIG.solana.rewardTokenAddress;
  if (!rewardMint || rewardMint.toUpperCase().startsWith('YOUR_')) return [];
  try {
    const connection = getRpcConnection();
    const owner      = new PublicKey(address);
    const [accPda]   = userPda(owner);

    // Scan the last 200 signatures touching our UserAccount PDA.
    // When a referree stakes, our UserAccount PDA is passed as remaining_accounts
    // so it appears in this signature list — that's how we detect referral events.
    const sigs = await connection.getSignaturesForAddress(accPda, { limit: 200 });
    const records: import('@/types').TxRecord[] = [];

    // Process in batches of 10 to avoid RPC rate limits on concurrent calls.
    const BATCH = 10;
    for (let i = 0; i < sigs.length; i += BATCH) {
      await Promise.allSettled(
        sigs.slice(i, i + BATCH).map(async (sig) => {
          if (sig.err) return;
          try {
            const tx = await connection.getParsedTransaction(sig.signature, {
              maxSupportedTransactionVersion: 0,
              commitment: 'confirmed',
            });
            if (!tx) return;

            const logs: string[] = tx.meta?.logMessages ?? [];
            // Only stake instructions distribute referral rewards
            if (!logs.some(l => l.includes('Instruction: Stake'))) return;

            // The fee-payer of the transaction is the staker
            const msg    = tx.transaction.message as any;
            const payerPubkey = msg.accountKeys?.[0]?.pubkey;
            const payer: string = typeof payerPubkey === 'string'
              ? payerPubkey
              : payerPubkey?.toBase58?.() ?? '';
            // Skip our own stake transactions — only other wallets staking triggers referral pay
            if (!payer || payer === address) return;

            // Measure change in our reward-mint ATA balance
            const preAmt  = (tx.meta?.preTokenBalances  ?? [])
              .find(b => b.mint === rewardMint && b.owner === address)
              ?.uiTokenAmount.uiAmount ?? 0;
            const postAmt = (tx.meta?.postTokenBalances ?? [])
              .find(b => b.mint === rewardMint && b.owner === address)
              ?.uiTokenAmount.uiAmount ?? 0;

            const diff = postAmt - preAmt;
            if (diff <= 0) return; // no referral credit in this tx

            records.push({
              id:        `sol-ref-${sig.signature}`,
              type:      'referral',
              label:     `Referral reward — ${payer.slice(0, 6)}...${payer.slice(-4)} staked`,
              amount:    diff,
              txHash:    sig.signature,
              timestamp: (sig.blockTime ?? 0) * 1000,
              status:    'success',
              network:   'solana',
            });
          } catch { /* skip individual parse failures */ }
        })
      );
    }

    return records.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

