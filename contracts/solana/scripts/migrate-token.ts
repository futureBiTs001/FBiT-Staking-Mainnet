/**
 * migrate-token.ts
 *
 * One-time migration: points the live Platform PDA at a new stake/reward token
 * mint (requires the `set_token_mints` instruction added alongside this script —
 * deploy that program upgrade FIRST via deploy_wsl.sh, then run this).
 *
 * Creates a single new Associated Token Account (owner = Platform PDA, mint = new
 * mint) and reuses it as the stake/reward/reserve vault — same pattern as the
 * original deployment, since stake and reward mint are the same token.
 *
 * The old vaults (old mint) are intentionally left untouched/abandoned.
 *
 * Usage (run from contracts/solana):
 *   ANCHOR_WALLET=C:/Users/myyy/.config/solana/admin.json \
 *   NEW_TOKEN_MINT=5uJ8rkiqEs5uzERCqVw9a1eC6BkP54MZAF3D229dyoME \
 *   npx ts-node scripts/migrate-token.ts
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ── Config ────────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey('8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp');
const RPC_URL     = process.env.SOLANA_RPC_URL ?? (() => { throw new Error('SOLANA_RPC_URL env var is required'); })();

const NEW_MINT_ADDR = process.env.NEW_TOKEN_MINT;
if (!NEW_MINT_ADDR) {
  console.error('❌  Set NEW_TOKEN_MINT env var before running.');
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
  const newMint = new PublicKey(NEW_MINT_ADDR!);

  console.log('\n📋  FBiT Staking — Migrate Token Mint');
  console.log('──────────────────────────────────────');
  console.log(`  Program ID   : ${PROGRAM_ID.toBase58()}`);
  console.log(`  Platform PDA : ${platformPda.toBase58()}`);
  console.log(`  Authority    : ${keypair.publicKey.toBase58()}`);
  console.log(`  New Mint     : ${newMint.toBase58()}`);
  if (DRY_RUN) console.log('\n  *** DRY RUN — no vault will be created, no transaction sent ***');

  const platformInfo = await connection.getAccountInfo(platformPda);
  if (!platformInfo) {
    console.error('\n❌  Platform PDA not found on-chain.');
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log('\n✅  Dry run complete — no changes made.');
    return;
  }

  // Create the new vault ATA (owner = platform PDA, mint = new mint) — reused
  // as stake/reward/reserve vault, same as the original single-mint setup.
  console.log('\n⏳  Creating new vault token account…');
  const newVault = await getOrCreateAssociatedTokenAccount(
    connection,
    keypair,       // payer
    newMint,
    platformPda,   // owner = platform PDA
    true           // allowOwnerOffCurve = true (PDA is off-curve)
  );
  console.log(`  New Vault    : ${newVault.address.toBase58()}`);

  // Call set_token_mints via raw instruction (new instruction — not in cached IDL)
  console.log('\n⏳  Calling set_token_mints…');
  const discriminator = anchorDiscriminator('set_token_mints');
  const argBuf = Buffer.concat([newMint.toBuffer(), newMint.toBuffer()]); // stake + reward = same mint

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: platformPda,       isSigner: false, isWritable: true },
      { pubkey: keypair.publicKey, isSigner: true,  isWritable: false },
    ],
    data: Buffer.concat([discriminator, argBuf]),
  });

  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [keypair], {
    commitment: 'confirmed',
  });

  console.log(`\n✅  Done!`);
  console.log(`   TX : https://explorer.solana.com/tx/${sig}`);
  console.log('\n── Copy these into web/.env.local ──────────────────────────');
  console.log(`NEXT_PUBLIC_SOLANA_STAKE_TOKEN_MINT=${newMint.toBase58()}`);
  console.log(`NEXT_PUBLIC_SOLANA_REWARD_TOKEN_MINT=${newMint.toBase58()}`);
  console.log(`NEXT_PUBLIC_SOLANA_STAKE_VAULT=${newVault.address.toBase58()}`);
  console.log(`NEXT_PUBLIC_SOLANA_REWARD_VAULT=${newVault.address.toBase58()}`);
  console.log(`NEXT_PUBLIC_SOLANA_RESERVE_VAULT=${newVault.address.toBase58()}`);
  console.log('─────────────────────────────────────────────────────────────\n');
}

main().catch(err => {
  console.error('\n❌  Error:', err.message ?? err);
  process.exit(1);
});
