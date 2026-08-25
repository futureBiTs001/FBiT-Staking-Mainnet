'use client';

/**
 * Single-sided SOL liquidity + auto-lock service module (FBiT/SOL, Meteora DAMM v2).
 *
 * No custom on-chain program — this composes Jupiter's swap API (already used by
 * `jupiterGetQuote`/`jupiterExecuteSwap` in ./solana.ts) with Meteora's own DAMM v2
 * program directly, via the official @meteora-ag/cp-amm-sdk. Positions are Token-2022
 * NFTs owned by the user's own wallet (self-custody) — locking is Meteora's own
 * on-chain enforcement (lockPosition / permanentLockPosition), not something this
 * module has to implement or guard itself.
 *
 * Flow: user deposits SOL only.
 *   Tx 1 — swap half to FBiT via Jupiter (reuses jupiterGetQuote/jupiterExecuteSwap).
 *   Tx 2 — wrap the kept SOL half, createPositionAndAddLiquidity (owner = user),
 *          then lockPosition (24-month cliff) or permanentLockPosition, plus a flat
 *          0.1 SOL platform-fee transfer. All built as one combined legacy Transaction.
 */

import {
  Connection, PublicKey, SystemProgram, Transaction, Keypair,
  LAMPORTS_PER_SOL, TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import {
  CpAmm,
  getLiquidityDeltaFromAmountA,
  getLiquidityDeltaFromAmountB,
  getAmountAFromLiquidityDelta,
  getAmountBFromLiquidityDelta,
} from '@meteora-ag/cp-amm-sdk';
import {
  TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction, NATIVE_MINT,
} from '@solana/spl-token';
import {
  getSolanaWallet, wrapSolanaSign, getRpcConnection, getOwner, ata,
  jupiterGetQuote, jupiterExecuteSwap, JupiterQuote, platformPda,
} from './solana';

// ── Constants ────────────────────────────────────────────────────────────────

const FBIT_MINT  = new PublicKey('5uJ8rkiqEs5uzERCqVw9a1eC6BkP54MZAF3D229dyoME');
const SOL_MINT   = new PublicKey('So11111111111111111111111111111111111111112'); // == NATIVE_MINT
const FBIT_POOL  = new PublicKey('ECUsT6sdz9rAj7tPfHnnHwxdkLaDcafHEfWZEdzc7hQx');

// Pool's own on-chain activation timestamp (read directly from its Pool account this
// session: activation_type=1 [timestamp], activation_point=1788416999). Trading on this
// pool is blocked by Meteora's own program before this moment — same value used for the
// countdown on the /launch page (LaunchCelebration.tsx's POOL_LAUNCH_TIMESTAMP_MS).
export const POOL_ACTIVATION_TIMESTAMP_MS = 1788416999 * 1000;

// ~24 months. Used as the lockPosition cliff duration.
const LOCK_DURATION_SECONDS_24M = 730 * 86400;

const PLATFORM_FEE_LAMPORTS = Math.round(0.1 * LAMPORTS_PER_SOL); // flat 0.1 SOL, on deposit AND withdraw
const MIN_DEPOSIT_SOL = 2; // keeps the flat 0.1 SOL fee to ~5% or less
const DECIMALS = 9;
const SCALE = 10 ** DECIMALS;

export type LockType = '24m' | 'permanent';

export interface LiquidityDepositQuote {
  totalSolLamports: BN;
  feeLamports: BN;
  netSolLamports: BN;      // total - fee, this is what actually gets split
  solKeptLamports: BN;     // half of netSolLamports, stays as SOL
  solToSwapLamports: BN;   // the other half, swapped to FBiT
  estFbitOutLamports: string; // from Jupiter quote (raw string, FBiT smallest units)
  priceImpactPct: number;
  jupiterQuote: JupiterQuote;
}

function toLamports(sol: number): BN {
  return new BN(Math.floor(sol * SCALE));
}
function fromLamports(bn: BN | string): number {
  return Number(bn.toString()) / SCALE;
}

function getCpAmmClient(connection: Connection): CpAmm {
  return new CpAmm(connection);
}

/** Admin/fee-recipient wallet — resolved dynamically from the staking Platform account's
 *  `authority` field (same admin wallet already used for the 1% staking-platform fee),
 *  by reading the raw account bytes directly (mirrors solanaFetchPlatformStats' approach
 *  in ./solana.ts — authority is the first 32 bytes after the 8-byte discriminator). */
async function getFeeRecipient(): Promise<PublicKey> {
  const connection = getRpcConnection();
  const [platPda] = platformPda();
  const info = await connection.getAccountInfo(platPda);
  if (!info) throw new Error('Could not resolve platform authority for fee routing.');
  return new PublicKey(info.data.subarray(8, 40));
}

// ── Pool info ────────────────────────────────────────────────────────────────

export async function solanaLiquidityGetPoolInfo() {
  const connection = getRpcConnection();
  const cpAmm = getCpAmmClient(connection);
  const pool = await cpAmm.fetchPoolState(FBIT_POOL);
  const now = Math.floor(Date.now() / 1000);
  return {
    pool,
    isActive: now * 1000 >= POOL_ACTIVATION_TIMESTAMP_MS,
    activationTimestampMs: POOL_ACTIVATION_TIMESTAMP_MS,
  };
}

// ── Deposit quote (preview) ─────────────────────────────────────────────────

/**
 * Given a total SOL amount the user wants to deposit, computes the fee, the
 * SOL/FBiT split, and a live Jupiter quote for the swap leg. Does not send anything.
 */
export async function solanaLiquidityGetDepositQuote(
  solAmount: number,
  slippageBps = 100,
): Promise<LiquidityDepositQuote> {
  if (solAmount < MIN_DEPOSIT_SOL) {
    throw new Error(`Minimum deposit is ${MIN_DEPOSIT_SOL} SOL.`);
  }
  const totalSolLamports = toLamports(solAmount);
  const feeLamports      = new BN(PLATFORM_FEE_LAMPORTS);
  if (totalSolLamports.lte(feeLamports)) {
    throw new Error('Deposit amount is too small to cover the platform fee.');
  }
  const netSolLamports    = totalSolLamports.sub(feeLamports);
  const half               = netSolLamports.divn(2);
  const solKeptLamports    = netSolLamports.sub(half); // gets the remainder unit if odd
  const solToSwapLamports  = half;

  const jupiterQuote = await jupiterGetQuote(
    SOL_MINT.toBase58(),
    FBIT_MINT.toBase58(),
    solToSwapLamports.toString(),
    slippageBps,
  );

  return {
    totalSolLamports,
    feeLamports,
    netSolLamports,
    solKeptLamports,
    solToSwapLamports,
    estFbitOutLamports: jupiterQuote.outAmountRaw,
    priceImpactPct: jupiterQuote.priceImpactPct,
    jupiterQuote,
  };
}

// ── Deposit (2-tx flow) ──────────────────────────────────────────────────────

export async function solanaLiquidityDeposit(
  solAmount: number,
  lockType: LockType,
  slippageBps = 100,
): Promise<{ swapTxHash: string; positionTxHash: string; positionAddress: string }> {
  const owner      = getOwner();
  const wallet      = getSolanaWallet();
  const connection  = getRpcConnection();
  const cpAmm       = getCpAmmClient(connection);

  const quote = await solanaLiquidityGetDepositQuote(solAmount, slippageBps);

  // ── Tx 1: swap half (net of fee) to FBiT via Jupiter ──
  const { txHash: swapTxHash } = await jupiterExecuteSwap(quote.jupiterQuote);

  // Re-check the actual FBiT received (the quote is an estimate; slippage may have
  // changed the real amount) by reading the user's FBiT ATA balance post-swap.
  const fbitAta = ata(FBIT_MINT, owner);
  const fbitBalance = await connection.getTokenAccountBalance(fbitAta).catch(() => null);
  const fbitReceivedLamports = fbitBalance
    ? new BN(fbitBalance.value.amount)
    : new BN(quote.estFbitOutLamports);

  // ── Tx 2: wrap kept SOL, create position + add liquidity, lock, pay flat fee ──
  const poolState = await cpAmm.fetchPoolState(FBIT_POOL);
  const solAta = getAssociatedTokenAddressSync(NATIVE_MINT, owner, false, TOKEN_PROGRAM_ID);

  const instructions: TransactionInstruction[] = [];

  // Wrap the kept SOL half into the user's WSOL ATA (create if needed, transfer, sync).
  const solAtaInfo = await connection.getAccountInfo(solAta);
  if (!solAtaInfo) {
    instructions.push(
      createAssociatedTokenAccountInstruction(owner, solAta, owner, NATIVE_MINT, TOKEN_PROGRAM_ID),
    );
  }
  instructions.push(
    SystemProgram.transfer({ fromPubkey: owner, toPubkey: solAta, lamports: BigInt(quote.solKeptLamports.toString()) }),
    createSyncNativeInstruction(solAta, TOKEN_PROGRAM_ID),
  );

  // Compute liquidityDelta from both sides (FBiT = token A, SOL = token B per the pool's
  // own on-chain layout, verified this session) and take the min — standard "how much
  // balanced liquidity can these two amounts support" calculation.
  const liquidityFromA = getLiquidityDeltaFromAmountA(
    fbitReceivedLamports, poolState.sqrtPrice, poolState.sqrtMaxPrice, poolState.collectFeeMode,
  );
  const liquidityFromB = getLiquidityDeltaFromAmountB(
    quote.solKeptLamports, poolState.sqrtMinPrice, poolState.sqrtPrice, poolState.collectFeeMode,
  );
  const liquidityDelta = BN.min(liquidityFromA, liquidityFromB);

  const positionNftKeypair = Keypair.generate();

  const createAndAddTx = await cpAmm.createPositionAndAddLiquidity({
    owner,
    pool: FBIT_POOL,
    positionNft: positionNftKeypair.publicKey,
    liquidityDelta,
    maxAmountTokenA: fbitReceivedLamports,
    maxAmountTokenB: quote.solKeptLamports,
    tokenAAmountThreshold: fbitReceivedLamports,
    tokenBAmountThreshold: quote.solKeptLamports,
    tokenAMint: FBIT_MINT,
    tokenBMint: SOL_MINT,
    tokenAProgram: TOKEN_PROGRAM_ID,
    tokenBProgram: TOKEN_PROGRAM_ID,
  });
  instructions.push(...createAndAddTx.instructions);

  const positionAddress = PublicKey.findProgramAddressSync(
    [Buffer.from('position'), positionNftKeypair.publicKey.toBuffer()],
    cpAmm['_program'].programId,
  )[0];
  const positionNftAccount = getAssociatedTokenAddressSync(
    positionNftKeypair.publicKey, owner, false, TOKEN_2022_PROGRAM_ID,
  );

  if (lockType === 'permanent') {
    const lockTx = await cpAmm.permanentLockPosition({
      owner, position: positionAddress, positionNftAccount, pool: FBIT_POOL,
      unlockedLiquidity: liquidityDelta,
    });
    instructions.push(...lockTx.instructions);
  } else {
    const cliffPoint = new BN(Math.floor(Date.now() / 1000) + LOCK_DURATION_SECONDS_24M);
    const vestingAccount = Keypair.generate().publicKey; // placeholder PDA slot per SDK's expected shape
    const lockTx = await cpAmm.lockPosition({
      owner, payer: owner, position: positionAddress, positionNftAccount, pool: FBIT_POOL,
      cliffPoint,
      periodFrequency: new BN(1),
      cliffUnlockLiquidity: liquidityDelta, // 100% unlocks at the single cliff
      liquidityPerPeriod: new BN(0),
      numberOfPeriod: 0,
      innerPosition: true,
    } as any);
    instructions.push(...lockTx.instructions);
  }

  // Flat 0.1 SOL platform fee (deducted from the deposit total, see solanaLiquidityGetDepositQuote).
  const feeRecipient = await getFeeRecipient();
  instructions.push(
    SystemProgram.transfer({ fromPubkey: owner, toPubkey: feeRecipient, lamports: BigInt(quote.feeLamports.toString()) }),
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const tx = new Transaction({ feePayer: owner, recentBlockhash: blockhash });
  tx.add(...instructions);
  tx.partialSign(positionNftKeypair);

  const signedTx: Transaction = await wrapSolanaSign(() => wallet.signTransaction(tx));
  const positionTxHash = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false });
  await connection.confirmTransaction({ signature: positionTxHash, blockhash, lastValidBlockHeight }, 'confirmed');

  return { swapTxHash, positionTxHash, positionAddress: positionAddress.toBase58() };
}

// ── Positions ────────────────────────────────────────────────────────────────

export interface LiquidityPositionSummary {
  positionAddress: string;
  positionNftAccount: string;
  lockType: LockType | 'none';
  unlockedLiquidity: string;
  vestedLiquidity: string;
  permanentLockedLiquidity: string;
  feeOwedFbit: number;
  feeOwedSol: number;
  unlockTimestampMs: number | null; // null for permanent or unlocked
}

export async function solanaLiquidityGetUserPositions(owner: PublicKey): Promise<LiquidityPositionSummary[]> {
  const connection = getRpcConnection();
  const cpAmm = getCpAmmClient(connection);
  const rows = await cpAmm.getPositionsByUserAndTokenMint(owner, FBIT_MINT);

  return Promise.all(rows.filter(r => r.pool.equals(FBIT_POOL)).map(async (r) => {
    const s = r.positionState as any;
    const isPermanent = cpAmm.isPermanentLockedPosition(s);
    const isLocked     = cpAmm.isLockedPosition(s);
    let unlockTimestampMs: number | null = null;
    if (isLocked && !isPermanent) {
      const vestings = await cpAmm.getAllVestingsByPosition(r.position);
      const cliff = vestings[0]?.account as any;
      unlockTimestampMs = cliff ? Number(cliff.cliffPoint) * 1000 : null;
    }
    return {
      positionAddress: r.position.toBase58(),
      positionNftAccount: r.positionNftAccount.toBase58(),
      lockType: isPermanent ? 'permanent' : (isLocked ? '24m' : 'none'),
      unlockedLiquidity: s.unlockedLiquidity.toString(),
      vestedLiquidity: s.vestedLiquidity.toString(),
      permanentLockedLiquidity: s.permanentLockedLiquidity.toString(),
      feeOwedFbit: fromLamports(s.feeAPending),
      feeOwedSol: fromLamports(s.feeBPending),
      unlockTimestampMs,
    };
  }));
}

// ── Claim / Compound / Withdraw ─────────────────────────────────────────────

async function buildClaimTx(positionAddress: string): Promise<{ tx: Transaction; owner: PublicKey; connection: Connection; wallet: any }> {
  const owner = getOwner();
  const wallet = getSolanaWallet();
  const connection = getRpcConnection();
  const cpAmm = getCpAmmClient(connection);
  const position = new PublicKey(positionAddress);
  const positionState = await cpAmm.fetchPositionState(position);
  const poolState = await cpAmm.fetchPoolState(FBIT_POOL);
  const positionNftAccount = getAssociatedTokenAddressSync(
    (positionState as any).nftMint, owner, false, TOKEN_2022_PROGRAM_ID,
  );

  const claimTx = await cpAmm.claimPositionFee({
    owner, position, pool: FBIT_POOL, positionNftAccount,
    tokenAMint: poolState.tokenAMint, tokenBMint: poolState.tokenBMint,
    tokenAVault: poolState.tokenAVault, tokenBVault: poolState.tokenBVault,
    tokenAProgram: TOKEN_PROGRAM_ID, tokenBProgram: TOKEN_PROGRAM_ID,
  });

  return { tx: claimTx, owner, connection, wallet };
}

export async function solanaLiquidityClaimFees(positionAddress: string): Promise<{ txHash: string }> {
  const { tx, connection, wallet } = await buildClaimTx(positionAddress);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  const signedTx: Transaction = await wrapSolanaSign(() => wallet.signTransaction(tx));
  const txHash = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false });
  await connection.confirmTransaction({ signature: txHash, blockhash, lastValidBlockHeight }, 'confirmed');
  return { txHash };
}

/**
 * Claim + add the claimed amounts back into the same position, in one transaction.
 * The compounded amount lands as additional UNLOCKED liquidity on top of the
 * still-locked principal (a deliberate v1 default — see plan doc's open item on
 * this — giving the user access to compounded gains before the lock ends).
 */
export async function solanaLiquidityCompoundFees(positionAddress: string): Promise<{ txHash: string }> {
  const owner = getOwner();
  const wallet = getSolanaWallet();
  const connection = getRpcConnection();
  const cpAmm = getCpAmmClient(connection);
  const position = new PublicKey(positionAddress);

  const { tx: claimTx } = await buildClaimTx(positionAddress);
  const positionState = await cpAmm.fetchPositionState(position);
  const poolState = await cpAmm.fetchPoolState(FBIT_POOL);
  const positionNftAccount = getAssociatedTokenAddressSync(
    (positionState as any).nftMint, owner, false, TOKEN_2022_PROGRAM_ID,
  );

  const feeA = new BN((positionState as any).feeAPending.toString());
  const feeB = new BN((positionState as any).feeBPending.toString());
  if (feeA.isZero() && feeB.isZero()) throw new Error('No fees to compound yet.');

  const liquidityFromA = getLiquidityDeltaFromAmountA(feeA, poolState.sqrtPrice, poolState.sqrtMaxPrice, poolState.collectFeeMode);
  const liquidityFromB = getLiquidityDeltaFromAmountB(feeB, poolState.sqrtMinPrice, poolState.sqrtPrice, poolState.collectFeeMode);
  const liquidityDelta = BN.min(liquidityFromA, liquidityFromB);

  const addTx = await cpAmm.addLiquidity({
    owner, position, pool: FBIT_POOL, positionNftAccount,
    liquidityDelta,
    maxAmountTokenA: feeA, maxAmountTokenB: feeB,
    tokenAAmountThreshold: feeA, tokenBAmountThreshold: feeB,
    tokenAMint: poolState.tokenAMint, tokenBMint: poolState.tokenBMint,
    tokenAVault: poolState.tokenAVault, tokenBVault: poolState.tokenBVault,
    tokenAProgram: TOKEN_PROGRAM_ID, tokenBProgram: TOKEN_PROGRAM_ID,
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const tx = new Transaction({ feePayer: owner, recentBlockhash: blockhash });
  tx.add(...claimTx.instructions, ...addTx.instructions);

  const signedTx: Transaction = await wrapSolanaSign(() => wallet.signTransaction(tx));
  const txHash = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false });
  await connection.confirmTransaction({ signature: txHash, blockhash, lastValidBlockHeight }, 'confirmed');
  return { txHash };
}

/** Withdraw after unlock (24-month positions only — permanent-locked principal can never
 *  be withdrawn by design). Charges the same flat 0.1 SOL platform fee as deposit. */
export async function solanaLiquidityWithdraw(positionAddress: string): Promise<{ txHash: string }> {
  const owner = getOwner();
  const wallet = getSolanaWallet();
  const connection = getRpcConnection();
  const cpAmm = getCpAmmClient(connection);
  const position = new PublicKey(positionAddress);

  const positionState = await cpAmm.fetchPositionState(position);
  const poolState = await cpAmm.fetchPoolState(FBIT_POOL);
  const positionNftAccount = getAssociatedTokenAddressSync(
    (positionState as any).nftMint, owner, false, TOKEN_2022_PROGRAM_ID,
  );
  const vestings = await cpAmm.getAllVestingsByPosition(position);

  const removeTx = await cpAmm.removeAllLiquidity({
    owner, position, pool: FBIT_POOL, positionNftAccount,
    tokenAAmountThreshold: new BN(0), tokenBAmountThreshold: new BN(0),
    tokenAMint: poolState.tokenAMint, tokenBMint: poolState.tokenBMint,
    tokenAVault: poolState.tokenAVault, tokenBVault: poolState.tokenBVault,
    tokenAProgram: TOKEN_PROGRAM_ID, tokenBProgram: TOKEN_PROGRAM_ID,
    vestings: vestings.map(v => ({ account: v.publicKey, vestingState: v.account })),
    currentPoint: new BN(Math.floor(Date.now() / 1000)),
  });

  const feeRecipient = await getFeeRecipient();
  const feeIx = SystemProgram.transfer({ fromPubkey: owner, toPubkey: feeRecipient, lamports: BigInt(PLATFORM_FEE_LAMPORTS) });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const tx = new Transaction({ feePayer: owner, recentBlockhash: blockhash });
  tx.add(...removeTx.instructions, feeIx);

  const signedTx: Transaction = await wrapSolanaSign(() => wallet.signTransaction(tx));
  const txHash = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false });
  await connection.confirmTransaction({ signature: txHash, blockhash, lastValidBlockHeight }, 'confirmed');
  return { txHash };
}

export { MIN_DEPOSIT_SOL, FBIT_MINT, FBIT_POOL, SOL_MINT };
