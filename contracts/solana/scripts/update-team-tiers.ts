/**
 * update-team-tiers.ts
 *
 * Calls set_team_target_tier for all 10 tiers to update the live on-chain
 * values to the new 9-decimal thresholds — Bronze starts at 50K FBiT, Titan
 * tops out at 100M FBiT (40% of the 250M fixed supply). Run this AFTER
 * migrate-token.ts.
 *
 * Uses raw Anchor-discriminator instructions (same pattern as migrate-token.ts /
 * set-annual-emission.ts) — no IDL file required.
 *
 * Usage (run from contracts/solana):
 *   ANCHOR_WALLET=/home/myyy/.config/solana/id.json \
 *   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \
 *   npx ts-node scripts/update-team-tiers.ts
 *
 * Optional env vars:
 *   CLUSTER   — defaults to mainnet-beta (used only for explorer links)
 *   DRY_RUN=1 — print tier data without sending transactions
 */

import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ── Constants (mirrors DEFAULT_TEAM_MIN_STAKED / DEFAULT_TEAM_BONUS_BPS in lib.rs) ──

const DECIMALS = 1_000_000_000n; // 10^9 — new mint

const TIERS: { minStaked: bigint; bonusBps: bigint }[] = [
  { minStaked:      50_000n * DECIMALS, bonusBps: 200n },  // Tier 0 —   50K →  2%
  { minStaked:     100_000n * DECIMALS, bonusBps: 300n },  // Tier 1 —  100K →  3%
  { minStaked:     250_000n * DECIMALS, bonusBps: 400n },  // Tier 2 —  250K →  4%
  { minStaked:     500_000n * DECIMALS, bonusBps: 500n },  // Tier 3 —  500K →  5%
  { minStaked:   1_000_000n * DECIMALS, bonusBps: 600n },  // Tier 4 —    1M →  6%
  { minStaked:   2_500_000n * DECIMALS, bonusBps: 700n },  // Tier 5 —  2.5M →  7%
  { minStaked:   5_000_000n * DECIMALS, bonusBps: 750n },  // Tier 6 —    5M →  7.5%
  { minStaked:  10_000_000n * DECIMALS, bonusBps: 850n },  // Tier 7 —   10M →  8.5%
  { minStaked:  20_000_000n * DECIMALS, bonusBps: 900n },  // Tier 8 —   20M →  9%
  { minStaked: 100_000_000n * DECIMALS, bonusBps: 1000n }, // Tier 9 —  100M → 10%
];

// ── Config ────────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey('8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp');
const CLUSTER    = process.env.CLUSTER ?? 'mainnet-beta';
const RPC_URL    = process.env.SOLANA_RPC_URL ?? (() => { throw new Error('SOLANA_RPC_URL env var is required'); })();
const DRY_RUN    = process.env.DRY_RUN === '1';

// ── Load wallet ───────────────────────────────────────────────────────────────

const walletPath = process.env.ANCHOR_WALLET
  ?? path.join(os.homedir(), '.config', 'solana', 'id.json');

if (!fs.existsSync(walletPath)) {
  console.error(`❌  Wallet not found at ${walletPath}`);
  process.exit(1);
}
const keypair = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
);

// ── Platform PDA ──────────────────────────────────────────────────────────────

const [platformPda] = PublicKey.findProgramAddressSync(
  [Buffer.from('platform')],
  PROGRAM_ID
);

function anchorDiscriminator(instructionName: string): Buffer {
  const hash = crypto.createHash('sha256')
    .update(`global:${instructionName}`)
    .digest();
  return Buffer.from(hash.subarray(0, 8));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed');

  console.log('\n📋  FBiT Staking — Update Team Target Tiers (Bronze 50K → Titan 100M)');
  console.log('────────────────────────────────────────────────────────────────');
  console.log(`  Cluster      : ${CLUSTER}`);
  console.log(`  Authority    : ${keypair.publicKey.toBase58()}`);
  console.log(`  Program ID   : ${PROGRAM_ID.toBase58()}`);
  console.log(`  Platform PDA : ${platformPda.toBase58()}`);
  console.log(`  Decimals     : 9  (10^9 per whole token)`);
  if (DRY_RUN) console.log('\n  *** DRY RUN — no transactions will be sent ***');
  console.log('');

  if (!DRY_RUN) {
    const platformInfo = await connection.getAccountInfo(platformPda);
    if (!platformInfo) {
      console.error('❌  Platform PDA not found on-chain. Has the program been initialized?');
      process.exit(1);
    }
  }

  console.log('  Idx  Min Team Staked (raw u64)      Bonus BPS');
  console.log('  ───  ────────────────────────────   ─────────');
  for (let i = 0; i < TIERS.length; i++) {
    const { minStaked, bonusBps } = TIERS[i];
    console.log(
      `   ${i}   ${minStaked.toString().padEnd(30)}  ${bonusBps} bps (${Number(bonusBps) / 100}%)`
    );
  }
  console.log('');

  if (DRY_RUN) {
    console.log('✅  Dry run complete — no transactions sent.');
    return;
  }

  for (let i = 0; i < TIERS.length; i++) {
    const { minStaked, bonusBps } = TIERS[i];
    process.stdout.write(`  Tier ${i}: sending…`);

    const discriminator = anchorDiscriminator('set_team_target_tier');
    const argBuf = Buffer.alloc(1 + 8 + 8);
    argBuf.writeUInt8(i, 0);
    argBuf.writeBigUInt64LE(minStaked, 1);
    argBuf.writeBigUInt64LE(bonusBps, 9);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: platformPda,       isSigner: false, isWritable: true },
        { pubkey: keypair.publicKey, isSigner: true,  isWritable: false },
      ],
      data: Buffer.concat([discriminator, argBuf]),
    });

    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [keypair], { commitment: 'confirmed' });

    console.log(` ✅  https://explorer.solana.com/tx/${sig}`);
  }

  console.log('\n✅  All 10 tiers updated successfully.');
}

main().catch(err => {
  console.error('\n❌  Error:', err.message ?? err);
  process.exit(1);
});
