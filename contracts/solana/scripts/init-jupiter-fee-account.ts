/**
 * init-jupiter-fee-account.ts
 *
 * One-time setup: creates the Jupiter Referral Token Account for the FBiT mint,
 * under the existing Referral Account (already registered at referral.jup.ag).
 * This account is what Jupiter's /swap API deposits the 1% platform fee into
 * whenever FBiT is the *output* token of a swap.
 *
 * The SOL-side referral token account already exists on-chain (created earlier) —
 * only FBiT needs this one-time init.
 *
 * Usage (run from contracts/solana):
 *   ANCHOR_WALLET=C:/Users/myyy/.config/solana/admin.json \
 *   npx ts-node scripts/init-jupiter-fee-account.ts
 */

import { Connection, Keypair, PublicKey, sendAndConfirmTransaction } from '@solana/web3.js';
import { ReferralProvider } from '@jup-ag/referral-sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ── Config ────────────────────────────────────────────────────────────────────

const RPC_URL          = process.env.SOLANA_RPC_URL ?? (() => { throw new Error('SOLANA_RPC_URL env var is required'); })();
const REFERRAL_ACCOUNT = new PublicKey('4NNtPCmZyHyWhBfizg5qsTmkwDjjFD7NSJNb741WCdoj');
const FBIT_MINT        = new PublicKey('5uJ8rkiqEs5uzERCqVw9a1eC6BkP54MZAF3D229dyoME');

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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed');
  const provider = new ReferralProvider(connection);

  console.log('\n📋  Jupiter Referral — Init FBiT Fee Token Account');
  console.log('────────────────────────────────────────────────────');
  console.log(`  Referral Account : ${REFERRAL_ACCOUNT.toBase58()}`);
  console.log(`  FBiT Mint        : ${FBIT_MINT.toBase58()}`);
  console.log(`  Payer            : ${keypair.publicKey.toBase58()}`);

  const existing = await connection.getAccountInfo(
    provider.getReferralTokenAccountPubKey({ referralAccountPubKey: REFERRAL_ACCOUNT, mint: FBIT_MINT })
  );
  if (existing) {
    console.log('\n⚠️   FBiT referral token account already exists — nothing to do.');
    return;
  }

  const { tx, referralTokenAccountPubKey } = await provider.initializeReferralTokenAccount({
    payerPubKey:            keypair.publicKey,
    referralAccountPubKey:  REFERRAL_ACCOUNT,
    mint:                   FBIT_MINT,
  });

  console.log(`\n⏳  Creating referral token account ${referralTokenAccountPubKey.toBase58()}…`);
  const sig = await sendAndConfirmTransaction(connection, tx, [keypair], { commitment: 'confirmed' });

  console.log(`\n✅  Done!`);
  console.log(`   TX             : https://explorer.solana.com/tx/${sig}`);
  console.log(`   Fee Account    : ${referralTokenAccountPubKey.toBase58()}`);
  console.log('   (should match the hardcoded FBiT entry in JUPITER_FEE_ACCOUNTS in web/src/lib/contracts/solana.ts)\n');
}

main().catch(err => {
  console.error('\n❌  Error:', err.message ?? err);
  process.exit(1);
});
