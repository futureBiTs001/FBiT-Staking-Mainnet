/**
 * void-stale-stakes.ts
 *
 * Force-marks a list of stale (pre-migration) StakeEntry accounts inactive
 * using the void_stale_stake instruction added in this session's mainnet
 * upgrade. Does not move any tokens — the corresponding vault balance was
 * already burned separately via burn-stale-vault.ts.
 *
 * Usage (run from contracts/solana):
 *   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \
 *   ANCHOR_WALLET=/home/myyy/.config/solana/id.json \
 *   npx ts-node scripts/void-stale-stakes.ts
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

const PROGRAM_ID = new PublicKey('8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp');
const RPC_URL      = process.env.SOLANA_RPC_URL ?? (() => { throw new Error('SOLANA_RPC_URL env var is required'); })();
const DRY_RUN       = process.env.DRY_RUN === '1';

const walletPath = process.env.ANCHOR_WALLET
  ?? path.join(os.homedir(), '.config', 'solana', 'admin.json');
if (!fs.existsSync(walletPath)) { console.error(`❌  Wallet not found at ${walletPath}`); process.exit(1); }
const keypair = Keypair.fromSecretKey(Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8'))));

const [platformPda] = PublicKey.findProgramAddressSync([Buffer.from('platform')], PROGRAM_ID);

function anchorDiscriminator(instructionName: string): Buffer {
  return Buffer.from(crypto.createHash('sha256').update(`global:${instructionName}`).digest().subarray(0, 8));
}

// Fresh scan (2026-08-20, post-upgrade) of all StakeEntry PDAs with is_active = true.
const STALE_STAKE_ENTRIES: string[] = [
  'WqK2ZiARvWN3ZQZMKBYj5HAi8Lh5SPnwe3ZUjmxMbkB',
  '2A8Q2TDWaRPU63jJngrBz9aMRT2nFRun3znoYSmv9tVi',
  '4F9tUXoj9oRGod4iZyea8FNcZTYue7Ttoa8MbVtmwugx',
  '7eitexuDh67WBmjpxNhd18dCP2qDnAviuZxU8DdGzruK',
  '8jzzvnEn9KQgUjH1UVD17y1tTSKdTJLScs4LR6wN3e4Z',
  '9fxpZeJvztawBzVhUchmJ3mZVjJpdo22XNHhG2uFiufX',
  '9kcmot7bwtyjTFesRMNsznveezQqv7cB6q7NByiUXPgz',
  'AYEX42uvfnJSVh9Dfsh7AcXjsZsA9fVXbZWAPLjVDb4M',
  'BpTzeMt3rVVGxzT1RxD6MRfEpwmDbQzEPyCmUxG2e61G',
  'D1w2hUzgUujTPysoaNesnJoFG8QqKFW7346DdNbXQGNw',
  'DZRdJDRFkDG3Kf42omzSh6cQrJ5e9FCQdafcaNKCUwfF',
  'DdgvJZJLQxkCyz3XFbPGS4foNPsxJpEtKgWaW3aZefyx',
  'EiENSXk4ZX3ur6Nsb8oR2seBmDXsF6d9fesBVnYWmntr',
  'F5m89k9gYNEfb47nxe92yff7VvWsMGkp1aCgKwWfjFH2',
  'GTbPu9fCTfpqbd7vGGwpmZ4UbD7CHGtQVGc5EZUm33TB',
  'GgqeZ4w5ofo9mDvPZajDzKv9MbsVZGWFA7dkphSnprFi',
  'HAVQyr4CLXh9QkeoQTidfJP7NXS3igHHK7Uwx18R9uit',
  'HDriWrt7HgD5YKUBLawQHjfH5zReNUdZuGALFmnL2nso',
  'JEBdSjfmcGUN2zp17vK9FtNVGkyXJLiBkGzL8VYdH83d',
];

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed');
  console.log('\n📋  FBiT Staking — Void Stale Stakes');
  console.log('──────────────────────────────────────');
  console.log(`  Entries to void: ${STALE_STAKE_ENTRIES.length}`);
  if (DRY_RUN) console.log('  *** DRY RUN — no transactions will be sent ***');

  let succeeded = 0, alreadyInactive = 0, failed = 0;

  for (let i = 0; i < STALE_STAKE_ENTRIES.length; i++) {
    const entryPubkey = new PublicKey(STALE_STAKE_ENTRIES[i]);
    process.stdout.write(`  [${i + 1}/${STALE_STAKE_ENTRIES.length}] ${entryPubkey.toBase58()} … `);

    try {
      const info = await connection.getAccountInfo(entryPubkey);
      if (!info) { console.log('NOT FOUND, skip'); continue; }
      const isActive = info.data[81] === 1; // StakeEntry.is_active offset (see lib.rs comment)
      if (!isActive) { console.log('already inactive, skip'); alreadyInactive++; continue; }

      if (DRY_RUN) { console.log('would void'); continue; }

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: platformPda,       isSigner: false, isWritable: false },
          { pubkey: entryPubkey,       isSigner: false, isWritable: true },
          { pubkey: keypair.publicKey, isSigner: true,  isWritable: false },
        ],
        data: anchorDiscriminator('void_stale_stake'),
      });
      const tx = new Transaction().add(ix);
      const sig = await sendAndConfirmTransaction(connection, tx, [keypair], { commitment: 'confirmed' });
      console.log(`voided (${sig.slice(0, 20)}…)`);
      succeeded++;
    } catch (err: any) {
      console.log(`FAILED: ${err.message ?? err}`);
      failed++;
    }
  }

  console.log('\n──────────────────────────────────────');
  console.log(`  Voided: ${succeeded}  Already inactive: ${alreadyInactive}  Failed: ${failed}`);
}

main().catch(err => { console.error('\n❌  Error:', err.message ?? err); process.exit(1); });
