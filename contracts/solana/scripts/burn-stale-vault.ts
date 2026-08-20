/**
 * burn-stale-vault.ts
 *
 * Burns the entire balance of a stale (non-current-mint) vault owned by the
 * Platform PDA, then closes it. Uses the burn_stale_vault instruction added
 * in this session's mainnet upgrade — hard-blocked on-chain from ever
 * touching a vault denominated in the CURRENT stake/reward mint.
 *
 * Usage (run from contracts/solana):
 *   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \
 *   ANCHOR_WALLET=/home/myyy/.config/solana/id.json \
 *   STALE_VAULT=851yeewTXCDVRW1CGNCQk9KJCavTj1mZMfTEJcjACAzH \
 *   STALE_MINT=CuubBzUTnQ4H2D2fHJCVWGEUEod2fJzq4nAPwfx8UGTu \
 *   npx ts-node scripts/burn-stale-vault.ts
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const PROGRAM_ID  = new PublicKey('8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp');
const RPC_URL      = process.env.SOLANA_RPC_URL ?? (() => { throw new Error('SOLANA_RPC_URL env var is required'); })();
const STALE_VAULT  = new PublicKey(process.env.STALE_VAULT ?? (() => { throw new Error('STALE_VAULT env var is required'); })());
const STALE_MINT   = new PublicKey(process.env.STALE_MINT  ?? (() => { throw new Error('STALE_MINT env var is required'); })());
const DRY_RUN       = process.env.DRY_RUN === '1';

const walletPath = process.env.ANCHOR_WALLET
  ?? path.join(os.homedir(), '.config', 'solana', 'admin.json');
if (!fs.existsSync(walletPath)) { console.error(`❌  Wallet not found at ${walletPath}`); process.exit(1); }
const keypair = Keypair.fromSecretKey(Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8'))));

const [platformPda] = PublicKey.findProgramAddressSync([Buffer.from('platform')], PROGRAM_ID);

function anchorDiscriminator(instructionName: string): Buffer {
  return Buffer.from(crypto.createHash('sha256').update(`global:${instructionName}`).digest().subarray(0, 8));
}

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed');

  console.log('\n📋  FBiT Staking — Burn Stale Vault');
  console.log('──────────────────────────────────────');
  console.log(`  Platform PDA : ${platformPda.toBase58()}`);
  console.log(`  Stale vault  : ${STALE_VAULT.toBase58()}`);
  console.log(`  Stale mint   : ${STALE_MINT.toBase58()}`);
  console.log(`  Authority    : ${keypair.publicKey.toBase58()}`);

  const vaultInfo = await connection.getTokenAccountBalance(STALE_VAULT);
  console.log(`  Current balance: ${vaultInfo.value.uiAmountString} tokens`);

  if (Number(vaultInfo.value.amount) === 0) {
    console.log('\n✅  Vault already empty — nothing to burn.');
    return;
  }

  if (DRY_RUN) { console.log('\n✅  Dry run complete — no transaction sent.'); return; }

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: platformPda,       isSigner: false, isWritable: false },
      { pubkey: keypair.publicKey, isSigner: true,  isWritable: true },
      { pubkey: STALE_VAULT,       isSigner: false, isWritable: true },
      { pubkey: STALE_MINT,        isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID,  isSigner: false, isWritable: false },
    ],
    data: anchorDiscriminator('burn_stale_vault'),
  });

  const tx = new Transaction().add(ix);
  console.log('\n  ⏳  Sending transaction…');
  const sig = await sendAndConfirmTransaction(connection, tx, [keypair], { commitment: 'confirmed' });
  console.log(`\n✅  Done! TX: https://explorer.solana.com/tx/${sig}`);
  console.log(`  Burned ${vaultInfo.value.uiAmountString} tokens and closed the vault.`);
}

main().catch(err => { console.error('\n❌  Error:', err.message ?? err); process.exit(1); });
