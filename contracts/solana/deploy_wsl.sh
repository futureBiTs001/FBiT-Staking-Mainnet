#!/bin/bash
set -e

echo "========================================"
echo "  FBiT Staking -- WSL Build and Deploy"
echo "========================================"

PROGRAM_ID="8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp"
PROJECT_DIR="/mnt/c/Users/myyy/OneDrive/Desktop/FBiT-Staking-TESTNET (1)/contracts/solana"

# ── Step 1: Rust ─────────────────────────────────────────────────────────────
echo ""
echo "[1/5] Checking Rust..."
if ! source "$HOME/.cargo/env" 2>/dev/null || ! command -v cargo &>/dev/null; then
  echo "  Installing Rust (non-interactive)..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
fi
source "$HOME/.cargo/env"
echo "  Rust OK: $(cargo --version)"

# ── Step 2: Solana CLI ───────────────────────────────────────────────────────
echo ""
echo "[2/5] Checking Solana CLI..."
SOLANA_BIN="$HOME/.local/share/solana/install/active_release/bin"
export PATH="$SOLANA_BIN:$PATH"
if ! command -v solana &>/dev/null; then
  echo "  Installing Solana CLI (stable)..."
  sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
  export PATH="$SOLANA_BIN:$PATH"
fi
echo "  Solana OK: $(solana --version)"

# ── Step 3: Anchor via AVM ──────────────────────────────────────────────────
echo ""
echo "[3/5] Checking Anchor CLI..."
export PATH="$HOME/.cargo/bin:$PATH"
if ! command -v avm &>/dev/null; then
  echo "  Installing AVM..."
  cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
fi
if ! command -v anchor &>/dev/null; then
  echo "  Installing Anchor 0.29.0..."
  avm install 0.29.0
  avm use 0.29.0
fi
echo "  Anchor OK: $(anchor --version)"

# ── Step 4: Build ───────────────────────────────────────────────────────────
echo ""
echo "[4/5] Building program..."
cd "$PROJECT_DIR"

# Ensure Solana toolchain is on PATH for anchor build
export PATH="$SOLANA_BIN:$HOME/.cargo/bin:$PATH"
anchor build

echo ""
echo "  Build complete!"
ls -lh target/deploy/fbit_staking.so

# ── Step 5: Deploy ───────────────────────────────────────────────────────────
echo ""
echo "[5/5] Wallet balance check..."
solana config set --url https://api.mainnet-beta.solana.com --keypair "$HOME/.config/solana/id.json"
solana balance

echo ""
echo "========================================"
echo "  Deploy command jo run hoga:"
echo "  anchor upgrade target/deploy/fbit_staking.so"
echo "    --provider.cluster mainnet"
echo "    --program-id $PROGRAM_ID"
echo ""
echo "  NOTE: ~3-5 SOL chahiye upgrade ke liye"
echo "========================================"
echo ""
read -p "Abhi deploy kare? (yes/no): " CONFIRM
if [ "$CONFIRM" = "yes" ]; then
  echo "  Deploying..."
  anchor upgrade target/deploy/fbit_staking.so \
    --provider.cluster mainnet \
    --program-id "$PROGRAM_ID"
  echo ""
  echo "SUCCESS! Program deployed: $PROGRAM_ID"
  echo "Explorer: https://solscan.io/account/$PROGRAM_ID"
else
  echo "Deploy rokha gaya. Jab ready ho toh run karo:"
  echo "  cd '$PROJECT_DIR' && anchor upgrade target/deploy/fbit_staking.so --provider.cluster mainnet --program-id $PROGRAM_ID"
fi
