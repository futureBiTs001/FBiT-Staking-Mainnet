/**
 * FBiT Staking — Platform Initializer + Reserve Depositor
 *
 * Run from web/ directory:
 *   node init-platform.js <keypair.json> [reserve_amount]
 *
 * keypair.json = Solana keypair JSON (array of 64 bytes).
 * If you exported from Phantom (base58 private key), convert first:
 *   node init-platform.js --convert <phantom-base58-key>
 *
 * Examples:
 *   node init-platform.js admin-keypair.json            (initialize only)
 *   node init-platform.js admin-keypair.json 1000000    (initialize + deposit 1M FBiT)
 */

'use strict';

const { Connection, PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } = require('@solana/web3.js');
const { AnchorProvider, Program, BN } = require('@coral-xyz/anchor');
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const NodeWallet = require('@coral-xyz/anchor/dist/cjs/nodewallet').default;
const bs58 = require('bs58');
const fs = require('fs');

// ── Config ────────────────────────────────────────────────────────────────────
const PROGRAM_ID  = '8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp';
const TOKEN_MINT  = 'CuubBzUTnQ4H2D2fHJCVWGEUEod2fJzq4nAPwfx8UGTu';
const RPC_URL     = process.env.SOLANA_RPC_URL ?? (() => { throw new Error('SOLANA_RPC_URL env var is required'); })();
const DECIMALS    = 6;
const SCALE       = 10 ** DECIMALS;

// ── Minimal IDL in Anchor 0.32 new format (writable/signer) ──────────────────
const IDL = {
  address:  PROGRAM_ID,
  version:  '0.1.0',
  name:     'fbit_staking',
  metadata: { address: PROGRAM_ID },
  instructions: [
    {
      name: 'initialize',
      accounts: [
        { name: 'platform',       writable: true  },
        { name: 'authority',      writable: true,  signer: true },
        { name: 'rewardTokenMint' },
        { name: 'stakeTokenMint'  },
        { name: 'systemProgram'   },
        { name: 'tokenProgram'    },
        { name: 'rent'            },
      ],
      args: [
        { name: 'rewardRate',        type: 'u64' },
        { name: 'referralRewardRate', type: 'u64' },
      ],
    },
    {
      name: 'depositReserve',
      accounts: [
        { name: 'platform',            writable: true },
        { name: 'authority',           writable: true, signer: true },
        { name: 'funderTokenAccount',  writable: true },
        { name: 'reserveVault',        writable: true },
        { name: 'tokenProgram' },
      ],
      args: [
        { name: 'amount', type: 'u64' },
      ],
    },
  ],
  accounts: [],
  types:    [],
  errors:   [],
};

// ── PDA / ATA helpers ─────────────────────────────────────────────────────────
function platformPda(programId) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform')],
    programId
  );
  return pda;
}

function ata(mint, owner) {
  const [addr] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return addr;
}

// ── Load keypair (JSON array or base58 string) ────────────────────────────────
function loadKeypair(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8').trim();
  let secretKey;
  if (raw.startsWith('[')) {
    secretKey = Uint8Array.from(JSON.parse(raw));
  } else {
    // base58 format (64-byte secret key exported from some wallets)
    secretKey = bs58.default ? bs58.default.decode(raw) : bs58.decode(raw);
  }
  return Keypair.fromSecretKey(secretKey);
}

// ── Convert mode: Phantom base58 private key → keypair JSON ──────────────────
// Reads the key from STDIN (piped or pasted at the prompt), never as a CLI argument —
// a raw private key on the command line lands in shell history and is visible to
// other processes on the machine via ps/Task Manager for the duration of the run.
function convertAndSave(base58Key) {
  let decoded;
  try {
    decoded = bs58.default ? bs58.default.decode(base58Key) : bs58.decode(base58Key);
  } catch {
    console.error('Invalid base58 key. Copy it exactly from Phantom Settings → Security → Export Private Key.');
    process.exit(1);
  }
  const kp = Keypair.fromSecretKey(decoded);
  const outFile = 'admin-keypair.json';
  fs.writeFileSync(outFile, JSON.stringify(Array.from(kp.secretKey)));
  console.log('Keypair saved to:', outFile);
  console.log('Public key:', kp.publicKey.toBase58());
  console.log('\nNow run:');
  console.log('  node init-platform.js admin-keypair.json');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const [,, arg1] = process.argv;

  // Convert mode — key comes from stdin, not argv
  if (arg1 === '--convert') {
    let base58Key;
    try {
      base58Key = fs.readFileSync(0, 'utf-8').trim(); // fd 0 = stdin
    } catch {
      base58Key = '';
    }
    if (!base58Key) {
      console.error('Usage: echo "<phantom-base58-private-key>" | node init-platform.js --convert');
      console.error('(or run with no pipe and paste the key, then press Ctrl+D)');
      process.exit(1);
    }
    convertAndSave(base58Key);
    return;
  }

  if (!arg1) {
    console.log('Usage:');
    console.log('  node init-platform.js <keypair.json> [reserve_amount]');
    console.log('  echo "<phantom-base58-private-key>" | node init-platform.js --convert');
    process.exit(0);
  }

  // Load admin keypair
  let keypair;
  try {
    keypair = loadKeypair(arg1);
  } catch (e) {
    console.error('Failed to load keypair:', e.message);
    process.exit(1);
  }
  console.log('Admin wallet :', keypair.publicKey.toBase58());

  const connection = new Connection(RPC_URL, 'confirmed');

  // SOL balance check
  const solBal = await connection.getBalance(keypair.publicKey);
  console.log('SOL balance  :', (solBal / 1e9).toFixed(4), 'SOL');
  if (solBal < 10_000_000) {
    console.error('Not enough SOL for tx fees. Need at least 0.01 SOL.');
    process.exit(1);
  }

  const wallet   = new NodeWallet(keypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed', skipPreflight: false });
  const program  = new Program(IDL, provider);

  const programId = new PublicKey(PROGRAM_ID);
  const mint      = new PublicKey(TOKEN_MINT);
  const platPda   = platformPda(programId);

  console.log('Program ID   :', PROGRAM_ID);
  console.log('Platform PDA :', platPda.toBase58());
  console.log('Token Mint   :', TOKEN_MINT);
  console.log('');

  // ── Step 1: Initialize platform ───────────────────────────────────────────
  const platInfo = await connection.getAccountInfo(platPda);
  if (platInfo && platInfo.data.length > 0) {
    console.log('✓ Platform already initialized — skipping initialize.');
  } else {
    console.log('Calling initialize...');
    try {
      const tx = await program.methods
        .initialize(new BN(100), new BN(500))
        .accounts({
          platform:       platPda,
          authority:      keypair.publicKey,
          rewardTokenMint: mint,
          stakeTokenMint:  mint,
          systemProgram:  SystemProgram.programId,
          tokenProgram:   TOKEN_PROGRAM_ID,
          rent:           SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      console.log('✓ Platform initialized!');
      console.log('  Tx:', tx);
      console.log('  https://solscan.io/tx/' + tx);
    } catch (err) {
      console.error('Initialize failed:', err.message ?? err);
      console.error('Full error:', err);
      process.exit(1);
    }
  }

  // ── Step 2: Deposit reserve (optional) ────────────────────────────────────
  const reserveArg = arg2;
  if (!reserveArg) {
    console.log('');
    console.log('Platform ready. To deposit reserve, run:');
    console.log(`  node init-platform.js ${arg1} <amount_in_FBiT>`);
    console.log('Example (1 million FBiT):');
    console.log(`  node init-platform.js ${arg1} 1000000`);
    return;
  }

  const reserveAmount = parseFloat(reserveArg);
  if (!reserveAmount || reserveAmount <= 0) {
    console.error('Invalid reserve amount. Must be a positive number (e.g. 1000000).');
    process.exit(1);
  }

  const funderAta   = ata(mint, keypair.publicKey);
  const reserveVault = ata(mint, platPda);

  console.log('');
  console.log(`Depositing ${reserveAmount.toLocaleString()} FBiT to reserve vault...`);
  console.log('  Your token account:', funderAta.toBase58());
  console.log('  Reserve vault     :', reserveVault.toBase58());

  // Check token balance before sending
  try {
    const tokenBal = await connection.getTokenAccountBalance(funderAta);
    const bal = tokenBal.value.uiAmount ?? 0;
    console.log('  Your FBiT balance :', bal.toLocaleString(), 'FBiT');
    if (bal < reserveAmount) {
      console.error(`Not enough FBiT. You have ${bal.toLocaleString()} but need ${reserveAmount.toLocaleString()}.`);
      process.exit(1);
    }
  } catch {
    console.error('Could not fetch your FBiT token account. Make sure you have FBiT tokens.');
    process.exit(1);
  }

  try {
    const tx = await program.methods
      .depositReserve(new BN(Math.floor(reserveAmount * SCALE)))
      .accounts({
        platform:           platPda,
        authority:          keypair.publicKey,
        funderTokenAccount: funderAta,
        reserveVault,
        tokenProgram:       TOKEN_PROGRAM_ID,
      })
      .rpc();
    console.log(`✓ Deposited ${reserveAmount.toLocaleString()} FBiT to reserve!`);
    console.log('  Tx:', tx);
    console.log('  https://solscan.io/tx/' + tx);
  } catch (err) {
    console.error('Deposit failed:', err.message ?? err);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message ?? err);
  process.exit(1);
});
