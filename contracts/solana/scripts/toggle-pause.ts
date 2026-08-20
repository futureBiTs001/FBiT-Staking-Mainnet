/**
 * toggle-pause.ts
 *
 * Flips platform.is_paused on the live Solana platform PDA using a raw
 * transaction (no IDL rebuild needed — discriminator is computed from the
 * instruction name). Pausing blocks stake/unstake/claim/compound instantly.
 *
 * Usage (run from contracts/solana):
 *   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \
 *   ANCHOR_WALLET=/home/myyy/.config/solana/id.json \
 *   npx ts-node scripts/toggle-pause.ts
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
const RPC_URL     = process.env.SOLANA_RPC_URL ?? (() => { throw new Error('SOLANA_RPC_URL env var is required'); })();
const DRY_RUN      = process.env.DRY_RUN === '1';

const walletPath = process.env.ANCHOR_WALLET
  ?? path.join(os.homedir(), '.config', 'solana', 'admin.json');
if (!fs.existsSync(walletPath)) {
  console.error(`❌  Wallet not found at ${walletPath}`);
  process.exit(1);
}
const keypair = Keypair.fromSecretKey(Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8'))));

const [platformPda] = PublicKey.findProgramAddressSync([Buffer.from('platform')], PROGRAM_ID);

function anchorDiscriminator(instructionName: string): Buffer {
  return Buffer.from(crypto.createHash('sha256').update(`global:${instructionName}`).digest().subarray(0, 8));
}

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed');

  console.log('\n📋  FBiT Staking — Toggle Pause');
  console.log('──────────────────────────────────────');
  console.log(`  Platform PDA : ${platformPda.toBase58()}`);
  console.log(`  Authority    : ${keypair.publicKey.toBase58()}`);

  const info = await connection.getAccountInfo(platformPda);
  if (!info) { console.error('❌  Platform PDA not found.'); process.exit(1); }
  const currentlyPaused = info.data[144] === 1;
  console.log(`  Currently    : ${currentlyPaused ? 'PAUSED' : 'ACTIVE'}`);
  console.log(`  After toggle : ${currentlyPaused ? 'ACTIVE' : 'PAUSED'}`);

  if (DRY_RUN) { console.log('\n✅  Dry run complete — no transaction sent.'); return; }

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: platformPda,       isSigner: false, isWritable: true },
      { pubkey: keypair.publicKey, isSigner: true,  isWritable: false },
    ],
    data: anchorDiscriminator('toggle_pause'),
  });

  const tx = new Transaction().add(ix);
  console.log('\n  ⏳  Sending transaction…');
  const sig = await sendAndConfirmTransaction(connection, tx, [keypair], { commitment: 'confirmed' });
  console.log(`\n✅  Done! TX: https://explorer.solana.com/tx/${sig}`);
  console.log(`  Platform is now ${currentlyPaused ? 'ACTIVE' : 'PAUSED'}`);
}

main().catch(err => { console.error('\n❌  Error:', err.message ?? err); process.exit(1); });
