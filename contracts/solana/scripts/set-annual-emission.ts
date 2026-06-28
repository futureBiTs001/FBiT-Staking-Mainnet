/**
 * set-annual-emission.ts
 *
 * Sets annual_emission on the live Solana platform PDA using a raw transaction
 * (no IDL rebuild needed — discriminator is computed from the instruction name).
 *
 * Usage (run from contracts/solana):
 *   ANCHOR_WALLET=C:/Users/myyy/.config/solana/admin.json \
 *   npx ts-node scripts/set-annual-emission.ts
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
const RPC_URL      = 'https://mainnet.helius-rpc.com/?api-key=2fca8858-977e-4caa-8eb8-c5f042a91002';
const DECIMALS     = 1_000_000n;

// 10 million FBiT per year → ~247% APY with current 4M staked
const ANNUAL_EMISSION_FBIT = BigInt(process.env.ANNUAL_EMISSION_FBIT ?? '10000000');
const ANNUAL_EMISSION_RAW  = ANNUAL_EMISSION_FBIT * DECIMALS;

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
// Anchor computes discriminator as sha256("global:<snake_case_name>")[0..8]

function anchorDiscriminator(instructionName: string): Buffer {
  const hash = crypto.createHash('sha256')
    .update(`global:${instructionName}`)
    .digest();
  return Buffer.from(hash.subarray(0, 8));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed');

  console.log('\n📋  FBiT Staking — Set Annual Emission');
  console.log('──────────────────────────────────────');
  console.log(`  Program ID   : ${PROGRAM_ID.toBase58()}`);
  console.log(`  Platform PDA : ${platformPda.toBase58()}`);
  console.log(`  Authority    : ${keypair.publicKey.toBase58()}`);
  if (DRY_RUN) console.log('\n  *** DRY RUN — no transaction will be sent ***');

  // Read current platform state
  const platformInfo = await connection.getAccountInfo(platformPda);
  if (!platformInfo) {
    console.error('\n❌  Platform PDA not found on-chain.');
    process.exit(1);
  }

  const data = platformInfo.data;
  // annual_emission offset in Platform account (after 8-byte discriminator):
  // authority(32) + reward_token_mint(32) + stake_token_mint(32)
  // + reward_rate(8) + referral_reward_rate(8) + total_staked(8)
  // + total_users(8) + reward_pool_balance(8) + is_paused(1)
  // + base_apy[1](8) + team_tier_min_staked[10](80) + team_tier_bonus_bps[10](80)
  // + total_burned(8) + halving_epoch(8) + halving_start_time(8)
  // + is_renounced(1) + fee_recipient(32) + total_fees_collected(8) + bump(1)
  // + total_reserve(8) + total_emission_released(8) + emission_start_time(8)
  // + annual_emission(8) ← here
  const DISC = 8;
  const totalStakedOff      = DISC + 32 + 32 + 32 + 8 + 8;          // 120
  const totalReserveOff     = DISC + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 8 + 80 + 80 + 8 + 8 + 8 + 1 + 32 + 8 + 1; // 355
  const annualEmissionOff   = totalReserveOff + 8 + 8 + 8;           // 379

  const currentTotalStaked    = data.readBigUInt64LE(totalStakedOff);
  const currentTotalReserve   = data.readBigUInt64LE(totalReserveOff);
  const currentAnnualEmission = data.readBigUInt64LE(annualEmissionOff);

  const MAX_APY = 30_000n;
  const BP      = 10_000n;

  const calcApy = (emission: bigint): bigint => {
    if (currentTotalStaked === 0n) return 0n;
    const raw = emission * BP / currentTotalStaked;
    return raw < MAX_APY ? raw : MAX_APY;
  };

  const currentApy = calcApy(currentAnnualEmission);
  const newApy     = calcApy(ANNUAL_EMISSION_RAW);

  const runwayYears = ANNUAL_EMISSION_FBIT > 0n
    ? Number(currentTotalReserve / DECIMALS) / Number(ANNUAL_EMISSION_FBIT)
    : 0;

  console.log('\n  ── Current State ────────────────────────────────────');
  console.log(`  total_staked     : ${Number(currentTotalStaked) / 1_000_000} FBiT`);
  console.log(`  total_reserve    : ${Number(currentTotalReserve) / 1_000_000} FBiT`);
  console.log(`  annual_emission  : ${Number(currentAnnualEmission) / 1_000_000} FBiT/year`);
  console.log(`  current APY      : ${Number(currentApy) / 100}%`);

  console.log('\n  ── After This Change ────────────────────────────────');
  console.log(`  annual_emission  : ${Number(ANNUAL_EMISSION_RAW) / 1_000_000} FBiT/year`);
  console.log(`  new APY          : ${Number(newApy) / 100}%  (with current staking)`);
  console.log(`  reserve runway   : ~${Math.round(runwayYears)} years`);
  console.log('');

  if (DRY_RUN) {
    console.log('✅  Dry run complete — no transaction sent.');
    return;
  }

  // Build raw instruction
  const discriminator = anchorDiscriminator('set_annual_emission');
  const argBuf = Buffer.alloc(8);
  argBuf.writeBigUInt64LE(ANNUAL_EMISSION_RAW);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: platformPda,          isSigner: false, isWritable: true },
      { pubkey: keypair.publicKey,    isSigner: true,  isWritable: false },
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
  console.log(`\n  annual_emission → ${Number(ANNUAL_EMISSION_RAW) / 1_000_000} FBiT/year`);
  console.log(`  APY             → ~${Number(newApy) / 100}% (decreases as more users stake)`);
}

main().catch(err => {
  console.error('\n❌  Error:', err.message ?? err);
  process.exit(1);
});
