/**
 * set-burn-bps.ts
 *
 * Sets burn_bps on the live Solana platform PDA using a raw transaction
 * (no IDL rebuild needed — discriminator is computed from the instruction name).
 *
 * Usage (run from contracts/solana):
 *   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \
 *   ANCHOR_WALLET=/home/myyy/.config/solana/id.json \
 *   npx ts-node scripts/set-burn-bps.ts
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

const PROGRAM_ID   = new PublicKey('8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp');
const RPC_URL       = process.env.SOLANA_RPC_URL ?? (() => { throw new Error('SOLANA_RPC_URL env var is required'); })();

// The frontend has always displayed 10% (1000 bps) as the burn rate — this brings
// the on-chain value in line with that, rather than the other way around.
const NEW_BURN_BPS = BigInt(process.env.NEW_BURN_BPS ?? '1000');

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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed');

  console.log('\n📋  FBiT Staking — Set Burn BPS');
  console.log('──────────────────────────────────────');
  console.log(`  Program ID   : ${PROGRAM_ID.toBase58()}`);
  console.log(`  Platform PDA : ${platformPda.toBase58()}`);
  console.log(`  Authority    : ${keypair.publicKey.toBase58()}`);
  if (DRY_RUN) console.log('\n  *** DRY RUN — no transaction will be sent ***');

  const platformInfo = await connection.getAccountInfo(platformPda);
  if (!platformInfo) {
    console.error('\n❌  Platform PDA not found on-chain.');
    process.exit(1);
  }

  // burn_bps offset in Platform account (after 8-byte discriminator):
  // authority(32) + reward_token_mint(32) + stake_token_mint(32)
  // + reward_rate(8) + referral_reward_rate(8) + total_staked(8)
  // + total_users(8) + reward_pool_balance(8) + is_paused(1)
  // + base_apy[1](8) + team_tier_min_staked[10](80) + team_tier_bonus_bps[10](80)
  // + total_burned(8) + halving_epoch(8) + halving_start_time(8)
  // + is_renounced(1) + fee_recipient(32) + total_fees_collected(8) + bump(1)
  // + total_reserve(8) + total_emission_released(8) + emission_start_time(8)
  // + annual_emission(8) + burn_bps(8) ← here
  const data = platformInfo.data;
  const DISC = 8;
  const totalReserveOff = DISC + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 8 + 80 + 80 + 8 + 8 + 8 + 1 + 32 + 8 + 1; // 355
  const burnBpsOff      = totalReserveOff + 8 + 8 + 8 + 8; // 387

  const currentBurnBps = data.readBigUInt64LE(burnBpsOff);

  console.log('\n  ── Current State ────────────────────────────────────');
  console.log(`  burn_bps  : ${currentBurnBps.toString()} (${Number(currentBurnBps) / 100}%)`);
  console.log('\n  ── After This Change ────────────────────────────────');
  console.log(`  burn_bps  : ${NEW_BURN_BPS.toString()} (${Number(NEW_BURN_BPS) / 100}%)`);
  console.log('');

  if (currentBurnBps === NEW_BURN_BPS) {
    console.log('✅  Already at target value — nothing to do.');
    return;
  }

  if (DRY_RUN) {
    console.log('✅  Dry run complete — no transaction sent.');
    return;
  }

  const discriminator = anchorDiscriminator('set_burn_bps');
  const argBuf = Buffer.alloc(8);
  argBuf.writeBigUInt64LE(NEW_BURN_BPS);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: platformPda,       isSigner: false, isWritable: true },
      { pubkey: keypair.publicKey, isSigner: true,  isWritable: false },
    ],
    data: Buffer.concat([discriminator, argBuf]),
  });

  const tx = new Transaction().add(ix);
  console.log('  ⏳  Sending transaction…');

  const sig = await sendAndConfirmTransaction(connection, tx, [keypair], {
    commitment: 'confirmed',
  });

  console.log(`\n✅  Done!`);
  console.log(`   TX : https://explorer.solana.com/tx/${sig}`);
  console.log(`\n  burn_bps → ${NEW_BURN_BPS.toString()} (${Number(NEW_BURN_BPS) / 100}%)`);
}

main().catch(err => {
  console.error('\n❌  Error:', err.message ?? err);
  process.exit(1);
});
