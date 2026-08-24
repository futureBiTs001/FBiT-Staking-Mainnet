/**
 * close-stake-entries.ts
 *
 * Scans all StakeEntry PDAs on-chain and closes every one with
 * is_active == false via the close_stake_entry instruction (mainnet
 * upgrade 2026-08-24), reclaiming rent to the admin wallet and
 * removing the historical total_claimed figure that void_stale_stake
 * alone left behind. Still-active entries (real, live stakes) are
 * left untouched — the instruction would reject them anyway.
 *
 * Usage (run from contracts/solana):
 *   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \
 *   ANCHOR_WALLET=/home/myyy/.config/solana/id.json \
 *   npx ts-node scripts/close-stake-entries.ts
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
import bs58 from 'bs58';

const PROGRAM_ID = new PublicKey('8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp');
const RPC_URL      = process.env.SOLANA_RPC_URL ?? (() => { throw new Error('SOLANA_RPC_URL env var is required'); })();
const DRY_RUN       = process.env.DRY_RUN === '1';

const walletPath = process.env.ANCHOR_WALLET
  ?? path.join(os.homedir(), '.config', 'solana', 'admin.json');
if (!fs.existsSync(walletPath)) { console.error(`❌  Wallet not found at ${walletPath}`); process.exit(1); }
const keypair = Keypair.fromSecretKey(Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8'))));

const [platformPda] = PublicKey.findProgramAddressSync([Buffer.from('platform')], PROGRAM_ID);

function discriminator(prefix: string, name: string): Buffer {
  return Buffer.from(crypto.createHash('sha256').update(`${prefix}:${name}`).digest().subarray(0, 8));
}

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed');
  const stakeEntryDisc = discriminator('account', 'StakeEntry');

  console.log('\n📋  FBiT Staking — Close Inactive Stake Entries');
  console.log('──────────────────────────────────────');
  if (DRY_RUN) console.log('  *** DRY RUN — no transactions will be sent ***');

  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      { dataSize: 99 },
      { memcmp: { offset: 0, bytes: bs58.encode(stakeEntryDisc) } },
    ],
  });
  console.log(`  StakeEntry count: ${accounts.length}\n`);

  let closed = 0, skippedActive = 0, failed = 0;

  for (let i = 0; i < accounts.length; i++) {
    const { pubkey, account } = accounts[i];
    const d = account.data;
    const owner = new PublicKey(d.subarray(8, 40));
    const isActive = d[81] === 1; // StakeEntry.is_active offset (see lib.rs comment)

    process.stdout.write(`  [${i + 1}/${accounts.length}] ${owner.toBase58()} (${pubkey.toBase58().slice(0, 8)}…) … `);

    if (isActive) {
      console.log('skip, still active');
      skippedActive++;
      continue;
    }

    if (DRY_RUN) { console.log('would close'); continue; }

    try {
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: platformPda,       isSigner: false, isWritable: false },
          { pubkey,                    isSigner: false, isWritable: true },
          { pubkey: keypair.publicKey, isSigner: true,  isWritable: true },
        ],
        data: discriminator('global', 'close_stake_entry'),
      });
      const tx = new Transaction().add(ix);
      const sig = await sendAndConfirmTransaction(connection, tx, [keypair], { commitment: 'confirmed' });
      console.log(`closed (${sig.slice(0, 20)}…)`);
      closed++;
    } catch (err: any) {
      console.log(`FAILED: ${err.message ?? err}`);
      failed++;
    }
  }

  console.log('\n──────────────────────────────────────');
  console.log(`  Closed: ${closed}  Skipped (still active): ${skippedActive}  Failed: ${failed}`);
}

main().catch(err => { console.error('\n❌  Error:', err.message ?? err); process.exit(1); });
