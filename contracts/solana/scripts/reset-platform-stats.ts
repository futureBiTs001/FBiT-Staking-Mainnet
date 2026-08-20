/**
 * reset-platform-stats.ts
 *
 * One-time, post-migration cleanup: zeroes out Platform counters (total_staked,
 * total_reserve, reward_pool_balance, total_burned, total_emission_released,
 * emission_start_time, last_release_time) that were accumulated under the OLD
 * stake/reward mint. `set_token_mints` only repoints the mint pubkeys — it never
 * touches these counters — so after a migration they're stale numbers denominated
 * in the old mint's tokens/decimals, no longer matching the real (empty) balance
 * of the freshly created vaults for the new mint. Left in place, they corrupt
 * `release_emission`/`claim_rewards` math going forward.
 *
 * Run this ONCE, immediately after migrate-token.ts, and BEFORE
 * set-annual-emission.ts or any depositReserve/fundRewardPool call.
 *
 * Requires the `reset_platform_stats` instruction (deployed via deploy_wsl.sh).
 *
 * Usage (run from contracts/solana):
 *   ANCHOR_WALLET=/home/myyy/.config/solana/id.json \
 *   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \
 *   npx ts-node scripts/reset-platform-stats.ts
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ── Config ────────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey('8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp');
const RPC_URL     = process.env.SOLANA_RPC_URL ?? (() => { throw new Error('SOLANA_RPC_URL env var is required'); })();
const DECIMALS    = 1_000_000_000n; // new mint is 9 decimals

const DRY_RUN = process.env.DRY_RUN === '1';

// ── Wallet ────────────────────────────────────────────────────────────────────

const walletPath = process.env.ANCHOR_WALLET
  ?? path.join(os.homedir(), '.config', 'solana', 'admin.json');

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

// ── Anchor discriminator ──────────────────────────────────────────────────────

function anchorDiscriminator(instructionName: string): Buffer {
  const hash = crypto.createHash('sha256')
    .update(`global:${instructionName}`)
    .digest();
  return Buffer.from(hash.subarray(0, 8));
}

// Field offsets in Platform account data (after 8-byte discriminator) — same
// layout as set-annual-emission.ts.
const DISC = 8;
const totalStakedOff     = DISC + 32 + 32 + 32 + 8 + 8;
const rewardPoolOff      = totalStakedOff + 8 + 8;
const totalBurnedOff     = DISC + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 8 + 80 + 80;
const totalReserveOff    = DISC + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 8 + 80 + 80 + 8 + 8 + 8 + 1 + 32 + 8 + 1;
const totalReleasedOff   = totalReserveOff + 8;
const emissionStartOff   = totalReleasedOff + 8;
const annualEmissionOff  = emissionStartOff + 8;

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed');

  console.log('\n📋  FBiT Staking — Reset Platform Stats (post-migration)');
  console.log('──────────────────────────────────────────────────────');
  console.log(`  Program ID   : ${PROGRAM_ID.toBase58()}`);
  console.log(`  Platform PDA : ${platformPda.toBase58()}`);
  console.log(`  Authority    : ${keypair.publicKey.toBase58()}`);
  if (DRY_RUN) console.log('\n  *** DRY RUN — no transaction will be sent ***');

  const platformInfo = await connection.getAccountInfo(platformPda);
  if (!platformInfo) {
    console.error('\n❌  Platform PDA not found on-chain.');
    process.exit(1);
  }
  const data = platformInfo.data;

  console.log('\n  ── Current (stale) values ───────────────────────────');
  console.log(`  total_staked          : ${Number(data.readBigUInt64LE(totalStakedOff)) / Number(DECIMALS)}`);
  console.log(`  reward_pool_balance   : ${Number(data.readBigUInt64LE(rewardPoolOff)) / Number(DECIMALS)}`);
  console.log(`  total_burned          : ${Number(data.readBigUInt64LE(totalBurnedOff)) / Number(DECIMALS)}`);
  console.log(`  total_reserve         : ${Number(data.readBigUInt64LE(totalReserveOff)) / Number(DECIMALS)}`);
  console.log(`  total_emission_released: ${Number(data.readBigUInt64LE(totalReleasedOff)) / Number(DECIMALS)}`);
  console.log(`  emission_start_time   : ${data.readBigInt64LE(emissionStartOff)}`);
  console.log(`  annual_emission (unchanged by this ix): ${Number(data.readBigUInt64LE(annualEmissionOff)) / Number(DECIMALS)}`);
  console.log('\n  All of the above (except annual_emission) will be reset to 0.');

  if (DRY_RUN) {
    console.log('\n✅  Dry run complete — no transaction sent.');
    return;
  }

  const discriminator = anchorDiscriminator('reset_platform_stats');
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: platformPda,       isSigner: false, isWritable: true },
      { pubkey: keypair.publicKey, isSigner: true,  isWritable: false },
    ],
    data: discriminator, // no args
  });

  const tx = new Transaction().add(ix);
  console.log('\n  ⏳  Sending transaction…');
  const sig = await sendAndConfirmTransaction(connection, tx, [keypair], {
    commitment: 'confirmed',
  });

  console.log(`\n✅  Done!`);
  console.log(`   TX : https://explorer.solana.com/tx/${sig}`);
}

main().catch(err => {
  console.error('\n❌  Error:', err.message ?? err);
  process.exit(1);
});
