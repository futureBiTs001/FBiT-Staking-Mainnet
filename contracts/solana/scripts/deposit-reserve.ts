/**
 * deposit-reserve.ts
 *
 * One-time (or repeatable, up to MAX_FUND_LAMPORTS per call) admin deposit into
 * the long-term emission reserve vault. Starts the emission clock on first
 * deposit (emission_start_time / last_release_time).
 *
 * Usage (run from contracts/solana):
 *   ANCHOR_WALLET=/home/myyy/.config/solana/id.json \
 *   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \
 *   RESERVE_VAULT=<reserve vault token account address> \
 *   DEPOSIT_AMOUNT_FBIT=120000000 \
 *   npx ts-node scripts/deposit-reserve.ts
 *
 * Optional: DRY_RUN=1 to print without sending.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ── Config ────────────────────────────────────────────────────────────────────

const PROGRAM_ID  = new PublicKey('8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp');
const RPC_URL      = process.env.SOLANA_RPC_URL ?? (() => { throw new Error('SOLANA_RPC_URL env var is required'); })();
const DECIMALS      = 1_000_000_000n; // new mint is 9 decimals

const RESERVE_VAULT_ADDR = process.env.RESERVE_VAULT;
if (!RESERVE_VAULT_ADDR) {
  console.error('❌  Set RESERVE_VAULT env var before running.');
  process.exit(1);
}

const DEPOSIT_AMOUNT_FBIT = BigInt(process.env.DEPOSIT_AMOUNT_FBIT ?? '');
if (DEPOSIT_AMOUNT_FBIT <= 0n) {
  console.error('❌  Set DEPOSIT_AMOUNT_FBIT (whole FBiT, e.g. 120000000) before running.');
  process.exit(1);
}
const DEPOSIT_AMOUNT_RAW = DEPOSIT_AMOUNT_FBIT * DECIMALS;

const MIN_FUND = 100_000_000n; // 0.1 FBiT raw
const MAX_FUND = 250_000_000n * DECIMALS; // 250M FBiT raw
if (DEPOSIT_AMOUNT_RAW < MIN_FUND || DEPOSIT_AMOUNT_RAW > MAX_FUND) {
  console.error(`❌  Amount out of range. Min 0.1 FBiT, max 250,000,000 FBiT per call.`);
  process.exit(1);
}

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

function anchorDiscriminator(instructionName: string): Buffer {
  const hash = crypto.createHash('sha256')
    .update(`global:${instructionName}`)
    .digest();
  return Buffer.from(hash.subarray(0, 8));
}

async function main() {
  const connection   = new Connection(RPC_URL, 'confirmed');
  const reserveVault = new PublicKey(RESERVE_VAULT_ADDR!);

  const platformInfo = await connection.getAccountInfo(platformPda);
  if (!platformInfo) {
    console.error('\n❌  Platform PDA not found on-chain.');
    process.exit(1);
  }
  // reward_token_mint offset: disc(8) + authority(32) + reward_token_mint starts at 40
  const rewardMint = new PublicKey(platformInfo.data.subarray(40, 72));

  const funderAta = getAssociatedTokenAddressSync(rewardMint, keypair.publicKey);

  console.log('\n📋  FBiT Staking — Deposit Reserve');
  console.log('──────────────────────────────────────');
  console.log(`  Program ID     : ${PROGRAM_ID.toBase58()}`);
  console.log(`  Platform PDA   : ${platformPda.toBase58()}`);
  console.log(`  Authority      : ${keypair.publicKey.toBase58()}`);
  console.log(`  Reward Mint    : ${rewardMint.toBase58()}`);
  console.log(`  Funder ATA     : ${funderAta.toBase58()}`);
  console.log(`  Reserve Vault  : ${reserveVault.toBase58()}`);
  console.log(`  Deposit Amount : ${DEPOSIT_AMOUNT_FBIT} FBiT`);
  if (DRY_RUN) console.log('\n  *** DRY RUN — no transaction will be sent ***');

  const funderInfo = await connection.getTokenAccountBalance(funderAta).catch(() => null);
  if (!funderInfo) {
    console.error('\n❌  Funder token account not found or has no balance.');
    process.exit(1);
  }
  console.log(`\n  Funder balance : ${funderInfo.value.uiAmountString} FBiT`);
  if (BigInt(funderInfo.value.amount) < DEPOSIT_AMOUNT_RAW) {
    console.error('\n❌  Insufficient balance for this deposit.');
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log('\n✅  Dry run complete — no changes made.');
    return;
  }

  const discriminator = anchorDiscriminator('deposit_reserve');
  const argBuf = Buffer.alloc(8);
  argBuf.writeBigUInt64LE(DEPOSIT_AMOUNT_RAW);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: platformPda,       isSigner: false, isWritable: true },
      { pubkey: keypair.publicKey, isSigner: true,  isWritable: true },
      { pubkey: funderAta,         isSigner: false, isWritable: true },
      { pubkey: reserveVault,      isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID,  isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([discriminator, argBuf]),
  });

  const tx = new Transaction().add(ix);
  console.log('\n  ⏳  Sending transaction…');
  const sig = await sendAndConfirmTransaction(connection, tx, [keypair], {
    commitment: 'confirmed',
  });

  console.log(`\n✅  Done!`);
  console.log(`   TX : https://explorer.solana.com/tx/${sig}`);
  console.log(`\n  Reserve funded with ${DEPOSIT_AMOUNT_FBIT} FBiT — emission clock started.`);
}

main().catch(err => {
  console.error('\n❌  Error:', err.message ?? err);
  process.exit(1);
});
