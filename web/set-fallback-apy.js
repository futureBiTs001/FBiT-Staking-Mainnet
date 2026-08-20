'use strict';
/**
 * Sets base_apy[0] (fallback APY) to 1000 BPS (10%) on-chain.
 * Used when no one has staked yet (PoS formula needs total_staked > 0).
 *
 * Usage (from web/ folder) — pass a keypair JSON file path, not a raw private key:
 *   node set-fallback-apy.js admin-keypair.json
 */

const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { BN }   = require('@coral-xyz/anchor');
const fs       = require('fs');

const PROGRAM_ID_STR = '8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp';
const RPC_URL        = process.env.SOLANA_RPC_URL ?? (() => { throw new Error('SOLANA_RPC_URL env var is required'); })();
const NEW_APY_BPS    = 1000; // 10%

const PROGRAM_ID = new PublicKey(PROGRAM_ID_STR);

// ── Load keypair ─────────────────────────────────────────────────────────────
// File-path only — a raw private key must never be passed as a CLI argument
// (it lands in shell history and is visible to other processes via ps/Task Manager).
const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node set-fallback-apy.js <path-to-keypair.json>');
  process.exit(1);
}

let keypair;
try {
  if (!fs.existsSync(arg)) throw new Error(`Keypair file not found: ${arg}`);
  const raw = JSON.parse(fs.readFileSync(arg, 'utf8'));
  keypair = Keypair.fromSecretKey(Uint8Array.from(raw));
} catch (e) {
  console.error('Keypair load failed:', e.message);
  process.exit(1);
}
console.log('Authority:', keypair.publicKey.toBase58());

// ── setBatchApy discriminator (from IDL) ─────────────────────────────────────
// discriminator bytes for "setBatchApy" instruction
const SET_BATCH_APY_DISC = Buffer.from([109, 76, 87, 205, 176, 242, 123, 34]);

async function main() {
  const conn = new Connection(RPC_URL, 'confirmed');

  // Derive platform PDA
  const [platPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform')],
    PROGRAM_ID
  );
  console.log('Platform PDA:', platPda.toBase58());

  // Read current base_apy[0] from account
  const acct = await conn.getAccountInfo(platPda);
  if (!acct) throw new Error('Platform PDA not found — has platform been initialized?');
  const currentApy = acct.data.readBigUInt64LE(153); // base_apy[0] offset after 8-disc+32-auth+32-rewardMint+32-stakeMint+8+8+8+8+8+1 = 153
  console.log('Current base_apy[0]:', currentApy.toString(), 'BPS =', (Number(currentApy)/100).toFixed(1) + '%');
  console.log('Setting to:', NEW_APY_BPS, 'BPS = 10%');

  // Build setBatchApy instruction
  // Args: apy_values: [u64; 1] — fixed array, Anchor borsh = just 8 bytes (no length prefix)
  const argBuf = Buffer.alloc(8);
  argBuf.writeBigUInt64LE(BigInt(NEW_APY_BPS), 0);  // apy_values[0]

  const { Transaction, TransactionInstruction } = require('@solana/web3.js');
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: platPda,              isSigner: false, isWritable: true  },
      { pubkey: keypair.publicKey,    isSigner: true,  isWritable: false },
    ],
    data: Buffer.concat([SET_BATCH_APY_DISC, argBuf]),
  });

  const tx = new Transaction().add(ix);
  tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
  tx.feePayer = keypair.publicKey;
  tx.sign(keypair);

  console.log('\nSending transaction…');
  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  await conn.confirmTransaction(sig, 'confirmed');
  console.log('✓ setBatchApy succeeded!');
  console.log('  Tx:', sig);

  // Verify new value
  const acct2 = await conn.getAccountInfo(platPda);
  const newApy = acct2.data.readBigUInt64LE(153);
  console.log('  Verified base_apy[0] now:', newApy.toString(), 'BPS =', (Number(newApy)/100).toFixed(1) + '%');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
