'use strict';
/**
 * FBiT Staking — ONE-SHOT SETUP
 *
 * Kya karta hai (fully automatic):
 *   1. Program upgrade via WSL (adds fix_bump)
 *   2. fix_bump — platform.bump 0 → 253
 *   3. depositReserve — 700M FBiT reserve vault mein
 *   4. setAnnualEmission — 1,000,000 FBiT/year
 *
 * SIRF YEH EK COMMAND (web/ folder se) — keypair JSON file ka path do, raw private key nahi:
 *   node setup-all.js admin-keypair.json
 */

const { spawnSync } = require('child_process');
const {
  Connection, PublicKey, Keypair,
  Transaction, TransactionInstruction,
} = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const { BN } = require('@coral-xyz/anchor');
const bs58  = require('bs58');
const fs    = require('fs');
const path  = require('path');

// ── Config ──────────────────────────────────────────────────────────────────
const PROGRAM_ID_STR  = '8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp';
const TOKEN_MINT_STR  = 'CuubBzUTnQ4H2D2fHJCVWGEUEod2fJzq4nAPwfx8UGTu';
const RESERVE_VAULT_STR = '851yeewTXCDVRW1CGNCQk9KJCavTj1mZMfTEJcjACAzH';
const RPC_URL         = process.env.SOLANA_RPC_URL ?? (() => { throw new Error('SOLANA_RPC_URL env var is required'); })();
const DECIMALS        = 6;
const SCALE           = 10 ** DECIMALS;
const BUMP_OFFSET     = 378;  // platform.bump field in Platform account bytes
const CANONICAL_BUMP  = 253;

const PROGRAM_ID   = new PublicKey(PROGRAM_ID_STR);
const TOKEN_MINT   = new PublicKey(TOKEN_MINT_STR);
const RESERVE_VAULT = new PublicKey(RESERVE_VAULT_STR);

// Annual emission: 1,000,000 FBiT/year (in lamports with 6 decimals)
const ANNUAL_EMISSION_FBIT    = 1_000_000;
const ANNUAL_EMISSION_LAMPORTS = BigInt(ANNUAL_EMISSION_FBIT) * BigInt(SCALE);

// Instruction discriminators = sha256("global:<name>")[0..8]
const DISC_FIX_BUMP          = Buffer.from([ 55, 162,  45, 211, 135, 185,  66, 103]);
const DISC_DEPOSIT_RESERVE   = Buffer.from([187,  75, 224,  96, 122, 233, 220, 121]);
const DISC_SET_ANNUAL_EMISS  = Buffer.from([ 23, 188,  62,  60, 159,  23, 116, 166]);

// New .so path (WSL format), built with fix_bump instruction — override via env if your
// checkout lives elsewhere.
const SO_WSL_PATH = process.env.SO_WSL_PATH
  ?? '/mnt/c/Users/$(whoami)/fbit-staking/contracts/solana/target/sbpf-solana-solana/release/fbit_staking.so';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function loadKeypair(arg) {
  // File-path only — a raw private key must never be passed as a CLI argument
  // (it lands in shell history and is visible to other processes via ps/Task Manager).
  if (!fs.existsSync(arg)) {
    throw new Error(`Keypair file not found: ${arg}. Pass a path to a keypair JSON file, not a raw private key.`);
  }
  const raw = fs.readFileSync(arg, 'utf-8').trim();
  const secretKey = raw.startsWith('[')
    ? Uint8Array.from(JSON.parse(raw))
    : (bs58.default ? bs58.default.decode(raw) : bs58.decode(raw));
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
    console.error(`[${label}] Send failed:`, err?.message ?? err);
    if (err?.logs) console.error('  Logs:', err.logs.join('\n  '));
    throw err;
  }

  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
  return sig;
}

function windowsPathToWsl(winPath) {
  // C:\Users\... → /mnt/c/Users/...
  return winPath.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d) => `/mnt/${d.toLowerCase()}`);
}

function banner(title) {
  console.log('');
  console.log('════════════════════════════════════════════════════');
  console.log(' ' + title);
  console.log('════════════════════════════════════════════════════');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const keypairArg  = process.argv[2];
  const depositArg  = process.argv[3];

  if (!keypairArg) {
    console.log('');
    console.log('Usage:');
    console.log('  node setup-all.js admin-keypair.json');
    console.log('');
    console.log('Phantom se exported private key ko ek local JSON keypair file me save karke uska path do —');
    console.log('raw private key seedha command line pe kabhi mat pass karo (shell history me reh jaata hai).');
    console.log('');
    process.exit(0);
  }

  // ── Load keypair ──────────────────────────────────────────────────────────
  banner('LOADING KEYPAIR');
  let keypair;
  try {
    keypair = loadKeypair(keypairArg);
  } catch (e) {
    console.error('Keypair load failed:', e.message);
    console.error('Run: node init-platform.js --convert <phantom-base58-private-key>');
    process.exit(1);
  }

  const authority = keypair.publicKey;
  const connection = new Connection(RPC_URL, 'confirmed');

  console.log('Admin wallet  :', authority.toBase58());
  console.log('Program ID    :', PROGRAM_ID_STR);

  // ── SOL balance check ─────────────────────────────────────────────────────
  const solBal = await connection.getBalance(authority);
  const solNum  = solBal / 1e9;
  console.log('SOL balance   :', solNum.toFixed(6), 'SOL');

  if (solBal < 2_900_000_000) {
    console.error('');
    console.error('Not enough SOL! Upgrade buffer for this program needs 2.87 SOL.');
    console.error('Current :', solNum.toFixed(6), 'SOL');
    console.error('Required: 2.9 SOL minimum (buffer is refunded after upgrade)');
    console.error('');
    console.error('Send at least', (2.9 - solNum).toFixed(3), 'more SOL to:', authority.toBase58());
    process.exit(1);
  }

  // ── FBiT balance check ────────────────────────────────────────────────────
  const funderAta = ata(TOKEN_MINT, authority);
  console.log('Funder ATA    :', funderAta.toBase58());

  let fbitBalance = 0;
  try {
    const tokenBal = await connection.getTokenAccountBalance(funderAta);
    fbitBalance = tokenBal.value.uiAmount ?? 0;
    console.log('FBiT balance  :', fbitBalance.toLocaleString(), 'FBiT');
  } catch {
    console.error('FBiT token account not found. Send FBiT to:', authority.toBase58());
    process.exit(1);
  }

  if (fbitBalance < 1) {
    console.error('No FBiT in wallet. Send FBiT to deposit into reserve.');
    process.exit(1);
  }

  // Deposit amount: user-specified, or auto (use all available FBiT up to 800M)
  let depositAmount = depositArg
    ? parseFloat(depositArg)
    : Math.min(fbitBalance, 800_000_000);

  if (isNaN(depositAmount) || depositAmount <= 0) {
    console.error('Invalid deposit amount.');
    process.exit(1);
  }
  if (depositAmount > fbitBalance) {
    console.log(`Note: Requested ${depositAmount.toLocaleString()} FBiT but only have ${fbitBalance.toLocaleString()}. Using available balance.`);
    depositAmount = fbitBalance;
  }

  console.log('Will deposit  :', depositAmount.toLocaleString(), 'FBiT');

  // ── STEP 1: Program Upgrade via WSL ───────────────────────────────────────
  banner('STEP 1: PROGRAM UPGRADE');
  console.log('Upgrading on-chain program (adds fix_bump instruction)...');
  console.log('This takes 60-120 seconds. Please wait...');
  console.log('');

  // Embed keypair JSON directly in bash — writes to WSL /tmp (no Windows path issues)
  const keypairJson = JSON.stringify(Array.from(keypair.secretKey));
  const SOLANA_BIN  = '/home/myyy/.local/share/solana/install/active_release/bin/solana';
  const TMP_KP      = '/tmp/fbit_upgrade_kp.json';

  // Subshell preserves deploy exit code; rm runs after regardless
  const upgradeCmd =
    `printf '%s' '${keypairJson}' > ${TMP_KP} && ` +
    `${SOLANA_BIN} config set --url '${RPC_URL}' 2>/dev/null && ` +
    `( ${SOLANA_BIN} program deploy` +
    ` --program-id ${PROGRAM_ID_STR}` +
    ` --upgrade-authority ${TMP_KP}` +
    ` '${SO_WSL_PATH}' ) ; ` +
    `__EXIT=$? ; rm -f ${TMP_KP} ; exit $__EXIT`;

  const WSL_EXE = 'C:\\Windows\\System32\\wsl.exe';
  const upgradeResult = spawnSync(WSL_EXE, ['bash', '--noprofile', '--norc', '-c', upgradeCmd], {
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 300_000,
  });

  const upgradeStdout = (upgradeResult.stdout ?? '').trim();
  const upgradeStderr = (upgradeResult.stderr ?? '').trim();

  if (upgradeStdout) console.log(upgradeStdout);

  if (upgradeStderr) {
    upgradeStderr.split('\n').forEach(line => {
      if (!line.trim()) return;
      const low = line.toLowerCase();
      if (low.includes('error') || low.includes('fail') || low.includes('panic')) {
        console.error('[upgrade]', line);
      } else {
        console.log('[upgrade]', line);
      }
    });
  }

  if (upgradeResult.status !== 0) {
    console.error('');
    console.error('Program upgrade FAILED (exit code', upgradeResult.status, ')');
    if (upgradeResult.error) console.error('System error:', upgradeResult.error.message);
    process.exit(1);
  }

  console.log('');
  console.log('✓ Program upgraded successfully!');
  console.log('Waiting 5 seconds for upgrade to propagate...');
  await new Promise(r => setTimeout(r, 5000));

  // ── STEP 2: Fix Bump ──────────────────────────────────────────────────────
  banner('STEP 2: FIX PLATFORM BUMP');

  // Read current stored bump
  const platPda   = platformPda();
  const platInfo  = await connection.getAccountInfo(platPda);

  if (!platInfo || platInfo.data.length === 0) {
    console.error('Platform account not found! Run init-platform.js first.');
    process.exit(1);
  }

  const storedBump = platInfo.data[BUMP_OFFSET];
  console.log('Platform PDA  :', platPda.toBase58());
  console.log('Stored bump   :', storedBump, storedBump === CANONICAL_BUMP ? '✓ already correct' : '✗ needs fix');

  if (storedBump !== CANONICAL_BUMP) {
    console.log('Calling fix_bump...');

    const fixBumpIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: platPda,   isSigner: false, isWritable: true  },
        { pubkey: authority, isSigner: true,  isWritable: false },
      ],
      data: DISC_FIX_BUMP,
    });

    const sig = await sendAndConfirm(connection, keypair, fixBumpIx, 'fix_bump');
    console.log('✓ fix_bump OK!');
    console.log('  Tx:', sig);
    console.log('  https://solscan.io/tx/' + sig);

    // Verify on-chain
    const updated  = await connection.getAccountInfo(platPda);
    const newBump  = updated.data[BUMP_OFFSET];
    if (newBump !== CANONICAL_BUMP) {
      console.error(`fix_bump ran but bump is still ${newBump}. Something is wrong.`);
      process.exit(1);
    }
    console.log('✓ Bump verified on-chain:', newBump);
  } else {
    console.log('Bump is already 253 — skipping fix_bump.');
  }

  // ── STEP 3: Deposit Reserve ───────────────────────────────────────────────
  banner('STEP 3: DEPOSIT RESERVE');
  console.log('Depositing', depositAmount.toLocaleString(), 'FBiT to reserve vault...');
  console.log('Funder ATA    :', funderAta.toBase58());
  console.log('Reserve Vault :', RESERVE_VAULT.toBase58());

  const amountLamports = new BN(Math.floor(depositAmount * SCALE));
  const amountBuf      = amountLamports.toArrayLike(Buffer, 'le', 8);
  const depositData    = Buffer.concat([DISC_DEPOSIT_RESERVE, amountBuf]);

  const depositIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: platPda,         isSigner: false, isWritable: true  },
      { pubkey: authority,       isSigner: true,  isWritable: true  },
      { pubkey: funderAta,       isSigner: false, isWritable: true  },
      { pubkey: RESERVE_VAULT,   isSigner: false, isWritable: true  },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: depositData,
  });

  const depositSig = await sendAndConfirm(connection, keypair, depositIx, 'depositReserve');
  console.log('');
  console.log('✓ Reserve deposit successful!');
  console.log('  Tx:', depositSig);
  console.log('  https://solscan.io/tx/' + depositSig);

  // Verify on-chain total_reserve (offset 379, u64 LE = 8 bytes)
  const finalInfo    = await connection.getAccountInfo(platPda);
  const reserveBytes = finalInfo.data.slice(379, 387);
  const totalReserve = Number(Buffer.from(reserveBytes).readBigUInt64LE()) / SCALE;

  // ── STEP 4: Set Annual Emission = 1,000,000 FBiT/year ────────────────────
  banner('STEP 4: SET ANNUAL EMISSION');
  console.log(`Setting annual emission to ${ANNUAL_EMISSION_FBIT.toLocaleString()} FBiT/year...`);

  const emissionBuf  = Buffer.alloc(8);
  emissionBuf.writeBigUInt64LE(ANNUAL_EMISSION_LAMPORTS);
  const emissionData = Buffer.concat([DISC_SET_ANNUAL_EMISS, emissionBuf]);

  const emissionIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: platPda,   isSigner: false, isWritable: true  },
      { pubkey: authority, isSigner: true,  isWritable: false },
    ],
    data: emissionData,
  });

  const emissionSig = await sendAndConfirm(connection, keypair, emissionIx, 'setAnnualEmission');
  console.log('✓ Annual emission set!');
  console.log('  Tx:', emissionSig);
  console.log('  https://solscan.io/tx/' + emissionSig);
  console.log(`  Emission: ${ANNUAL_EMISSION_FBIT.toLocaleString()} FBiT/year`);

  // ── ALL DONE ───────────────────────────────────────────────────────────────
  console.log('');
  console.log('════════════════════════════════════════════════════');
  console.log(' ALL DONE! System is fully ready.');
  console.log('════════════════════════════════════════════════════');
  console.log('');
  console.log('✓ Program upgraded — fix_bump instruction active');
  console.log('✓ platform.bump = 253 (canonical)');
  console.log(`✓ Total reserve  : ${totalReserve.toLocaleString()} FBiT`);
  console.log(`✓ Annual emission: ${ANNUAL_EMISSION_FBIT.toLocaleString()} FBiT/year`);
  console.log('');
  console.log('Users can now: stake, claim, compound, unstake — all work!');
  console.log('APY system is ACTIVE. Emission releases automatically on claim/compound.');
  console.log('');
}

main().catch(err => {
  console.error('');
  console.error('Fatal error:', err?.message ?? err);
  if (err?.logs) console.error('Logs:', err.logs.join('\n'));
  process.exit(1);
});
