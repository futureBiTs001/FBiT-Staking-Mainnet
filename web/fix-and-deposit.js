'use strict';

/**
 * FBiT Staking — Fix Bump + Deposit Reserve
 *
 * Ek hi script mein do kaam:
 *   1) fix_bump  — platform.bump ko 0 se 253 karta hai (ek baar chahiye)
 *   2) depositReserve — reserve vault mein FBiT deposit karta hai
 *
 * Usage:
 *   node fix-and-deposit.js <keypair.json> [amount_in_FBiT]
 *
 * Example (800 million FBiT deposit):
 *   node fix-and-deposit.js admin-keypair.json 800000000
 *
 * Keypair file banana (key stdin se, CLI argument se nahi — shell history me nahi rahega):
 *   echo "<phantom-base58-private-key>" | node init-platform.js --convert
 */

const {
  Connection, PublicKey, Keypair,
  Transaction, TransactionInstruction,
} = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const { BN } = require('@coral-xyz/anchor');
const bs58 = require('bs58');
const fs   = require('fs');

// ── Config ─────────────────────────────────────────────────────────────────────
const PROGRAM_ID     = new PublicKey('8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp');
const TOKEN_MINT     = new PublicKey('CuubBzUTnQ4H2D2fHJCVWGEUEod2fJzq4nAPwfx8UGTu');
const RESERVE_VAULT  = new PublicKey('851yeewTXCDVRW1CGNCQk9KJCavTj1mZMfTEJcjACAzH');
const RPC_URL        = process.env.SOLANA_RPC_URL ?? (() => { throw new Error('SOLANA_RPC_URL env var is required'); })();
const DECIMALS       = 6;
const SCALE          = 10 ** DECIMALS;
const BUMP_OFFSET    = 378; // platform.bump field offset in Platform account data
const CANONICAL_BUMP = 253; // findProgramAddressSync([b"platform"], PROGRAM_ID).bump

// Instruction discriminators = sha256("global:<name>")[0..8]
const DISC_FIX_BUMP        = Buffer.from([ 55, 162,  45, 211, 135, 185,  66, 103]);
const DISC_DEPOSIT_RESERVE = Buffer.from([187,  75, 224,  96, 122, 233, 220, 121]);

// ── Helpers ─────────────────────────────────────────────────────────────────────

function platformPda() {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from('platform')], PROGRAM_ID);
  return pda;
}

function ata(mint, owner) {
  const [addr] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return addr;
}

function loadKeypair(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8').trim();
  let secretKey;
  if (raw.startsWith('[')) {
    secretKey = Uint8Array.from(JSON.parse(raw));
  } else {
    secretKey = bs58.default ? bs58.default.decode(raw) : bs58.decode(raw);
  }
  return Keypair.fromSecretKey(secretKey);
}

async function sendAndConfirm(connection, keypair, instruction, label) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const tx = new Transaction({ feePayer: keypair.publicKey, recentBlockhash: blockhash });
  tx.add(instruction);
  tx.sign(keypair);

  let sig;
  try {
    sig = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
  } catch (err) {
    console.error(`[${label}] Simulation/send failed:`, err?.message ?? err);
    if (err?.logs) console.error('Logs:', err.logs);
    throw err;
  }

  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
  return sig;
}

// ── Main ────────────────────────────────────────────────────────────────────────

async function main() {
  const keypairFile   = process.argv[2];
  const depositArg    = process.argv[3];

  if (!keypairFile) {
    console.log('Usage:');
    console.log('  node fix-and-deposit.js <keypair.json> [amount_in_FBiT]');
    console.log('  node fix-and-deposit.js admin-keypair.json 800000000');
    process.exit(0);
  }

  const depositAmount = depositArg ? parseFloat(depositArg) : 800_000_000;
  if (isNaN(depositAmount) || depositAmount <= 0) {
    console.error('Invalid deposit amount. Example: 800000000');
    process.exit(1);
  }

  // Load keypair
  let keypair;
  try {
    keypair = loadKeypair(keypairFile);
  } catch (e) {
    console.error('Keypair load failed:', e.message);
    process.exit(1);
  }

  const authority = keypair.publicKey;
  console.log('');
  console.log('Admin wallet  :', authority.toBase58());
  console.log('Program ID    :', PROGRAM_ID.toBase58());

  const connection = new Connection(RPC_URL, 'confirmed');

  // SOL balance check
  const solBal = await connection.getBalance(authority);
  console.log('SOL balance   :', (solBal / 1e9).toFixed(6), 'SOL');
  if (solBal < 5_000_000) {
    console.error('Not enough SOL. Need at least 0.005 SOL for transaction fees.');
    process.exit(1);
  }

  const platPda = platformPda();
  console.log('Platform PDA  :', platPda.toBase58());

  // Read platform account
  const platInfo = await connection.getAccountInfo(platPda);
  if (!platInfo || platInfo.data.length === 0) {
    console.error('Platform not initialized! Run init-platform.js first.');
    process.exit(1);
  }

  const storedBump = platInfo.data[BUMP_OFFSET];
  console.log('Stored bump   :', storedBump, storedBump === CANONICAL_BUMP ? '✓ correct' : '✗ needs fix');
  console.log('');

  // ── Step 1: fix_bump (only if needed) ─────────────────────────────────────────
  if (storedBump !== CANONICAL_BUMP) {
    console.log('═══════════════════════════════════════════');
    console.log('Step 1: Calling fix_bump...');
    console.log('═══════════════════════════════════════════');

    const fixBumpIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: platPda,    isSigner: false, isWritable: true  },
        { pubkey: authority,  isSigner: true,  isWritable: false },
      ],
      data: DISC_FIX_BUMP,
    });

    const sig = await sendAndConfirm(connection, keypair, fixBumpIx, 'fix_bump');
    console.log('✓ fix_bump OK!');
    console.log('  Tx:', sig);
    console.log('  https://solscan.io/tx/' + sig);

    // Verify bump was updated
    const updated = await connection.getAccountInfo(platPda);
    const newBump = updated.data[BUMP_OFFSET];
    if (newBump !== CANONICAL_BUMP) {
      console.error(`fix_bump ran but bump is still ${newBump}. Something is wrong.`);
      process.exit(1);
    }
    console.log('✓ Bump verified on-chain:', newBump);
    console.log('');
  } else {
    console.log('Step 1: Bump already correct (253) — skipping fix_bump.');
    console.log('');
  }

  // ── Step 2: depositReserve ─────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════');
  console.log('Step 2: Depositing reserve...');
  console.log('═══════════════════════════════════════════');

  const funderAta = ata(TOKEN_MINT, authority);
  console.log('Funder ATA    :', funderAta.toBase58());
  console.log('Reserve vault :', RESERVE_VAULT.toBase58());

  // Check FBiT balance
  let fbitBalance = 0;
  try {
    const tokenBal = await connection.getTokenAccountBalance(funderAta);
    fbitBalance = tokenBal.value.uiAmount ?? 0;
    console.log('FBiT balance  :', fbitBalance.toLocaleString(), 'FBiT');
  } catch {
    console.error('Could not read FBiT balance. Check funder token account exists.');
    process.exit(1);
  }

  if (fbitBalance < depositAmount) {
    console.error(`Not enough FBiT. Have ${fbitBalance.toLocaleString()}, need ${depositAmount.toLocaleString()}`);
    process.exit(1);
  }

  console.log('Depositing    :', depositAmount.toLocaleString(), 'FBiT');

  // Encode amount as u64 LE
  const amountLamports = new BN(Math.floor(depositAmount * SCALE));
  const amountBuf      = amountLamports.toArrayLike(Buffer, 'le', 8);
  const depositData    = Buffer.concat([DISC_DEPOSIT_RESERVE, amountBuf]);

  const depositIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: platPda,       isSigner: false, isWritable: true  },
      { pubkey: authority,     isSigner: true,  isWritable: true  },
      { pubkey: funderAta,     isSigner: false, isWritable: true  },
      { pubkey: RESERVE_VAULT, isSigner: false, isWritable: true  },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: depositData,
  });

  const depositSig = await sendAndConfirm(connection, keypair, depositIx, 'depositReserve');
  console.log('✓ Reserve deposit successful!');
  console.log('  Tx:', depositSig);
  console.log('  https://solscan.io/tx/' + depositSig);

  // Verify on-chain total_reserve (offset 379, u64 LE)
  const finalInfo    = await connection.getAccountInfo(platPda);
  const reserveBytes = finalInfo.data.slice(379, 387);
  const totalReserve = Number(Buffer.from(reserveBytes).readBigUInt64LE()) / SCALE;
  console.log('');
  console.log('✓ On-chain total_reserve:', totalReserve.toLocaleString(), 'FBiT');
  console.log('');
  console.log('════════════════════════════════════════════════════');
  console.log(' ALL DONE! Reserve funded. Emission system active.');
  console.log('════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('Fatal error:', err?.message ?? err);
  process.exit(1);
});
