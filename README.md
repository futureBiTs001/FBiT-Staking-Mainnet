# FBiT Staking — Solana DApp

A production-ready, decentralized staking platform for the **FBiT token** on **Solana**. The platform implements Proof-of-Stake (PoS) APY, a 10-level referral commission system, a Team Target Bonus program, a deflationary burn mechanism, and an automated emission reserve — all governed by an on-chain Anchor smart contract.

**Live Demo:** [https://stake.futurebit.in](https://stake.futurebit.in)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [How It Works — Complete Flow](#2-how-it-works--complete-flow)
3. [Reward & Fee System](#3-reward--fee-system)
4. [10-Level Referral System](#4-10-level-referral-system)
5. [Team Target Bonus](#5-team-target-bonus)
6. [Burn & PoS Emission System](#6-burn--pos-emission-system)
7. [Ownership Renouncement](#7-ownership-renouncement)
8. [Admin Panel](#8-admin-panel)
9. [Smart Contract](#9-smart-contract)
10. [Frontend Architecture](#10-frontend-architecture)
11. [Security System](#11-security-system)
12. [Project Structure](#12-project-structure)
13. [Environment Variables](#13-environment-variables)
14. [Deployment Guide](#14-deployment-guide)
15. [Technology Stack](#15-technology-stack)
16. [Token & Contract Addresses](#16-token--contract-addresses)
17. [Changelog](#17-changelog)

---

## 1. Project Overview

FBiT Staking is a fully on-chain staking DApp where users lock FBiT tokens for **30 days** and earn rewards. The APY is not fixed — it adjusts automatically based on how many tokens are currently staked (Proof-of-Stake model). As more users stake, the APY decreases; as users unstake, the APY rises. The system is designed to be fully autonomous — once the admin deposits the full token reserve and renounces ownership, the contract runs indefinitely without any human intervention.

### Core Highlights

| Feature | Details |
|---------|---------|
| Lock Period | 30 days (fixed) |
| Claim Interval | Every 6 hours (4 intervals/day) |
| APY Range | 10% – 300% (auto-adjusting, PoS) |
| Burn Rate | 10% of gross reward, adjustable 0–50% by admin |
| Referral Levels | 10 levels deep |
| Referral Total | 17.75% distributed across all 10 levels (live on-chain config; contract default is 30%) |
| Team Bonus | Up to +10% on top of staking rewards |
| Network | Solana Mainnet |
| Platform Fee | 1% on all operations (applies before and after ownership renouncement — see v2.1) |
| AI Support Chat | Claude-powered widget answering platform FAQs (`/api/support-chat`) |

---

## 2. How It Works — Complete Flow

### Step 1 — Connect Wallet
Users connect their Solana wallet (Phantom, Solflare, Backpack, or any Wallet Standard-compliant wallet) via **Reown AppKit**.

### Step 2 — Register with a Referral Link (Optional)
Before staking, a user can click a referral link (`?ref=<address>`). This stores the referrer on-chain and credits all 10 levels of the referral chain when the user stakes.

### Step 3 — Stake FBiT Tokens
1. User enters an amount of FBiT tokens.
2. Smart contract deducts a **1% platform fee** (sent to admin).
3. Remaining tokens are locked for **30 days**.
4. The contract records the effective APY at stake time for display.
5. The referral chain (up to 10 levels) immediately receives commissions from the reward pool.

### Step 4 — Earn Rewards
Rewards accumulate every **6 hours** (4 intervals/day). Formula:

```
grossReward = stakedAmount × effectiveAPY × intervals / (1,460 × 10,000)

Where:
  effectiveAPY = clamp(ANNUAL_EMISSION × 10,000 / totalStaked, 1_000, 30_000)
                 MIN_APY_BPS = 1,000 (10% floor)   MAX_APY_BPS = 30,000 (300% ceiling)
  intervals    = seconds elapsed / 21,600 (each interval = 6 hours)
  1,460        = total 6-hour intervals in one year (4 × 365)
```

The APY self-adjusts in real time:
- More stakers → lower APY (reward pie splits among more people)
- Fewer stakers → higher APY (each person gets a larger share)

### Step 5 — Claim or Compound Rewards
Every 6 hours the user can:

- **Claim**: Receive net FBiT reward to their wallet
- **Compound**: Re-stake the net reward, increasing their stake (and future earnings)

In both cases, the burn mechanism applies (see Section 3).

### Step 6 — Unstake After 30 Days
Once the lock period expires, the user calls Unstake. The contract:
1. Deducts 1% fee from the principal (removed after renouncement).
2. Transfers the remaining principal back to the user.

---

## 3. Reward & Fee System

### Before Ownership Renouncement

```
Gross Reward (R)
    │
    ├─ 1% Platform Fee  ──────────────────────→ Admin wallet
    │
    └─ 99% After Fee (A)
            │
            ├─ 10% Burn (A × 10%)  ───────────→ Burned on-chain 🔥
            │
            └─ 90% Net Reward (A × 90%)  ──────→ User wallet ✅
```

### After Ownership Renouncement

```
Gross Reward (R)
    │
    ├─ 0% Platform Fee  (removed — no admin)
    │
    └─ 100% After Fee (A = R)
            │
            ├─ 10% Burn (R × 10%)  ───────────→ Burned on-chain 🔥
            │
            ├─ 25% Fee  ──────────────────────→ feeRecipient (former admin)
            │   (of gross reward, from pool separately)
            │
            └─ Remaining  ────────────────────→ User wallet ✅
                (from pool — pool provides extra for feeRecipient)
```

> **Note:** After renouncement, the 1% transaction fee disappears. Instead, the former admin's address (`feeRecipient`) receives a passive income from the reward pool on every claim and compound. The burn (10%) always applies regardless of renouncement status.

### Team Bonus
If the user qualifies for a Team Target Tier (see Section 5), the bonus is added on top of the gross reward before any deductions:

```
totalGross = grossReward + teamBonus
```

---

## 4. 10-Level Referral System

When user A refers user B (and B stakes), users in the referral chain up to 10 levels above B each instantly receive a commission **directly from the reward pool**:

| Level | Commission | Who Receives |
|-------|-----------|-------------|
| 1 | 0.25% | Direct referrer (person who referred the staker) |
| 2 | 0.50% | Referrer's referrer |
| 3 | 1.25% | Level 3 upline |
| 4 | 1.50% | Level 4 upline |
| 5 | 1.75% | Level 5 upline |
| 6 | 2.00% | Level 6 upline |
| 7 | 2.25% | Level 7 upline |
| 8 | 2.50% | Level 8 upline |
| 9 | 2.75% | Level 9 upline |
| 10 | 3.00% | Level 10 upline |
| **Total** | **17.75%** | Distributed instantly on stake (contract default is 30% — an admin lowered this on-chain post-deploy) |

Referral commissions are paid **immediately** when the downstream user stakes — no waiting for claims.

### Referral Link Format
```
https://yourdomain.com/?ref=<wallet_address>
```

---

## 5. Team Target Bonus

On top of base staking rewards, users who build large teams earn an additional bonus multiplier. The bonus is based on the **total FBiT staked by all downline members** (up to 10 referral levels deep):

| Tier | Label | Min Team Staked | Bonus |
|------|-------|----------------|-------|
| 1 | Bronze | 50,000 FBiT | +2% |
| 2 | Silver | 100,000 FBiT | +3% |
| 3 | Gold | 250,000 FBiT | +4% |
| 4 | Platinum | 500,000 FBiT | +5% |
| 5 | Diamond | 1,000,000 FBiT | +6% |
| 6 | Ruby | 2,500,000 FBiT | +7% |
| 7 | Emerald | 5,000,000 FBiT | +7.5% |
| 8 | Sapphire | 10,000,000 FBiT | +8.5% |
| 9 | Obsidian | 20,000,000 FBiT | +9% |
| 10 | Titan | 100,000,000 FBiT | +10% |

The bonus applies automatically on every claim or compound — no user action required.

---

## 6. Burn & PoS Emission System

### Reward Burn (10% per Claim/Compound)
Every time a user claims or compounds, **10% of their gross reward is permanently burned** via an on-chain SPL token burn instruction. This is deflationary — it reduces the total circulating supply over time.

- The burn comes from the **user's share** — the reward pool does not pay extra for this.
- The burn percentage (`burnBps`) can be adjusted by the admin (range: 0–50%).

### Automated Annual Emission Reserve
The contract includes a long-term **emission reserve** system:

1. **Admin deposits** into the reserve allocation (initially 120,000,000 FBiT, topped up to 229,830,026 FBiT as of August 2026).
2. The contract **automatically releases** `ANNUAL_EMISSION` tokens per year from the reserve into the active reward pool.
3. Target: **12,000,000 FBiT/year** → an approximately 19-year nominal runway at the current reserve size.
4. The emission release is triggered automatically on every claim/compound — no cron job needed.

### PoS APY Formula
```
effectiveAPY (bps) = clamp(
    ANNUAL_EMISSION × 10,000 / totalStaked,
    1_000, 30_000
)

MIN_APY_BPS = 1,000 (10% floor)   MAX_APY_BPS = 30,000 (300% ceiling)
```

When no one is staking: APY sits at the 300% ceiling (attracts stakers).
As more tokens are staked: APY decreases automatically toward the 10% floor.

---

## 7. Ownership Renouncement

The admin can call **Renounce Ownership** from the Admin Panel. This is a **one-way, irreversible action**. After renouncement:

| Before Renounce | After Renounce |
|----------------|----------------|
| 1% fee on all operations → admin wallet | 0% platform fee |
| Admin can pause/unpause, block users, etc. | No admin — contract is autonomous |
| Admin can fund reward pool, set rates | Cannot change any parameter |
| Admin can set annual emission | Emission locked forever |

After renouncement, the former admin's address becomes `feeRecipient` and passively earns income from the reward pool on every user claim/compound. This is the admin's permanent passive revenue in exchange for giving up control.

> **Important:** Before renouncing, the admin must:
> - Deposit the full reserve allocation (`depositReserve`)
> - Set the desired annual emission (`setAnnualEmission`)
> - Configure all Team Target Tiers correctly
> - Ensure the reward pool has sufficient balance

---

## 8. Admin Panel

The Admin Panel is accessible only to wallet addresses whose SHA-256 hash is listed in `NEXT_PUBLIC_ADMIN_ADDRESS_HASHES`. It provides:

### Reward Pool Management
| Action | Description |
|--------|-------------|
| Fund Reward Pool | Directly add tokens to the active reward pool |
| Deposit Reserve | Deposit tokens into the long-term emission reserve |
| Release Emission | Manually trigger release of pending reserve emission |

### Platform Parameters
| Action | Description |
|--------|-------------|
| Set Reward Rate | Adjust the base reward multiplier |
| Set Referral Reward Rate | Adjust referral commission multiplier |
| Set Annual Emission | Set tokens distributed per year (drives PoS APY) |
| Set Burn % | Set the burn rate on claims (0–50%, in basis points) |

### Team Target Tiers
Admin can update all 10 Team Target Tiers on-chain — minimum team staked threshold and bonus percentage for each tier.

### User Management
| Action | Description |
|--------|-------------|
| Block User | Prevent a wallet from staking/claiming |
| Unblock User | Restore access for a blocked wallet |
| Pause Platform | Emergency halt — disables all staking operations |
| Unpause Platform | Resume normal operations |

### Ownership Renouncement
Permanently transfers to a trustless, admin-free operation mode.

---

## 9. Smart Contract

### Solana Contract — Anchor/Rust

**Location:** `contracts/solana/programs/fbit-staking/`

Built with the Anchor framework for Solana. Uses PDAs (Program Derived Addresses) for trustless account management.

**Program Instructions:**
- `initialize` — Set up the platform PDA
- `register_user` — Create a UserAccount PDA for new users
- `stake` — Stake FBiT SPL tokens
- `claim_rewards` — Claim accumulated rewards
- `compound_rewards` — Compound rewards back into stake
- `unstake` — Withdraw principal after lock period
- `fund_reward_pool` — Admin: add tokens to pool
- `set_reward_rate` — Admin: update reward rate
- `set_referral_reward_rate` — Admin: update referral rate
- `block_user` / `unblock_user` — Admin: user management
- `toggle_pause` — Admin: emergency pause
- `renounce_ownership` — Admin: one-way autonomy

**Accounts:**
- `Platform` PDA — global state (total staked, pool balance, rates, etc.)
- `UserAccount` PDA — per-user state (stakes, referrals, team stats)
- `StakeEntry` PDA — individual stake record
- Vault token accounts — hold staked FBiT and reward FBiT

---

## 10. Frontend Architecture

**Location:** `web/`

Built with **Next.js 16** (App Router, Turbopack) + **TypeScript** + **Tailwind CSS v4**.

### Pages
| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `page.tsx` | Marketing landing page — live stats, tokenomics, security, roadmap, FAQ |
| `/app` | `app/page.tsx` | Staking dashboard (Dashboard / Swap / Stake / Referral / Calculator / History / Admin tabs) |
| `/guide` | `guide/page.tsx` | Step-by-step staking tutorial |
| `/about` | `about/page.tsx` | About FBiT Staking (SEO landing content) |
| `/terms` | `terms/page.tsx` | Terms of Service |
| `/privacy` | `privacy/page.tsx` | Privacy Policy |
| `/export-data` | `export-data/page.tsx` | User data export tool |
| `/api/bot-assess` | route handler | Claude-based bot-detection risk assessment (server-side) |
| `/api/support-chat` | route handler | Claude-powered support chat backend (server-side) |
| `/opengraph-image` | route handler | Dynamically generated OG share image |

### Components

#### `web/src/components/staking/`
| File | Purpose |
|------|---------|
| `Dashboard.tsx` | Main view: Active Stakes list, Burn & PoS panel, Team Bonus panel, Transaction History |
| `StakePanel.tsx` | Stake form: amount input, APY display, reward estimation, stake button |

#### `web/src/components/admin/`
| File | Purpose |
|------|---------|
| `AdminPanel.tsx` | Full admin control: fund pool, set rates, manage users, Team Tiers, Renounce Ownership, ad-placement status (read-only) |

#### `web/src/components/history/`
| File | Purpose |
|------|---------|
| `HistoryPanel.tsx` | Complete activity history: on-chain + local tx records, summary stats, chain refresh |

#### `web/src/components/referral/`
| File | Purpose |
|------|---------|
| `ReferralPanel.tsx` | Referral link generator, referral stats, commission history |

#### `web/src/components/market/`
| File | Purpose |
|------|---------|
| `TokenPriceWidget.tsx` | Live FBiT price and market data |

#### `web/src/components/chat/`
| File | Purpose |
|------|---------|
| `SupportChat.tsx` | Floating AI support-chat widget (Claude Haiku via `/api/support-chat`) |

#### `web/src/components/ads/`
| File | Purpose |
|------|---------|
| `AdsManager.tsx` | Loads Coinzilla/Adcash placements based on `NEXT_PUBLIC_ADS_*` env vars |

#### `web/src/components/ui/`
| File | Purpose |
|------|---------|
| `ContractSetupNotice.tsx` | Warning banner when `.env.local` contract addresses are not set |

### Hooks
| Hook | Purpose |
|------|---------|
| `useContract.ts` | Unified contract interface, backed by Solana |
| `useSolanaStaking.ts` | All Solana on-chain reads/writes via `@solana/web3.js` + Anchor IDL |
| `useTokenPrice.ts` | Fetches live FBiT price from market APIs |
| `useTokenLogo.ts` | Resolves token logo URL |

### State Management
Zustand store (`web/src/lib/store.ts`) with localStorage persistence:
- `walletStates` — per-wallet stakes, transactions, balances, referral info
- `platformStats` — total staked, APY, burn rate, pool balance, emission data

Store key: `fbit-staking-v6` (versioned to force fresh state on breaking changes).

### Context
`WalletContext.tsx` — Solana wallet connection state (via Reown AppKit):
- `address` / `solanaAddress` — active wallet address
- `solanaReferrer` — referrer from URL param

### Contract Interface (`useContract.ts`)
All buttons in the UI call through this single hook:

```typescript
contract.stake(amount, referrer?)           // Stake tokens
contract.claimRewards(stakeId, stakedAt)    // Claim rewards
contract.compoundRewards(stakeId, stakedAt) // Compound rewards
contract.unstake(stakeId, stakedAt)         // Unstake after lock
contract.syncUserData()                     // Refresh user's on-chain data
contract.syncPlatformStats()                // Refresh platform stats
contract.fundRewardPool(amount)             // Admin: fund pool
contract.setRewardRate(rate)                // Admin: set reward rate
contract.blockUser(address)                 // Admin: block user
contract.renounceOwnership()                // Admin: renounce ownership
// ... and more
```

---

## 11. Security System

**Location:** `web/src/lib/security.ts`

### Rate Limiting
Every on-chain write is protected by a client-side rate limiter:

| Action | Limit |
|--------|-------|
| Stake | 3 attempts per 2 minutes |
| Claim / Compound | 5 attempts per minute |
| Admin actions | 3 attempts per minute per action |

```typescript
if (!checkRateLimit('stake', { maxCalls: 3, windowMs: 120_000 })) {
  toast.error('Too many attempts. Please wait.');
  return;
}
```

### Input Validation
```typescript
isValidSolanaAddress(addr)   // base58, 32–44 chars
isValidWalletAddress(addr)   // Solana address (base58)
isValidAmount(amount)        // finite, positive, max 9 decimals
isValidBps(bps)              // integer 0–10,000
isValidBonusBps(bps)         // integer 1–1,000
sanitizeText(value)          // strips HTML/script tags (XSS prevention)
```

### Smart Contract Security
- **PDA-based account validation**: strict owner/seed/signer checks on every instruction (Anchor)
- **Checked arithmetic**: overflow/underflow protection throughout reward, emission, and burn calculations
- **Access Control**: authority checks on all admin instructions
- **Emergency Pause**: instantly halts all user-facing operations
- **Lock Period Enforcement**: unstake reverts if called before `unlockAt`

---

## 12. Project Structure

```
FBiT-Staking/
│
├── contracts/
│   └── solana/                         # Solana Anchor program
│       ├── programs/fbit-staking/      # Rust source code
│       ├── scripts/
│       │   ├── initialize.ts           # Initialize platform PDA
│       │   ├── migrate-token.ts        # Point program at a new stake/reward mint
│       │   ├── set-annual-emission.ts  # Set the emission target
│       │   └── update-team-tiers.ts    # Update tiers on-chain
│       ├── target/idl/                 # Auto-generated IDL (after build)
│       ├── Anchor.toml                 # Anchor config (mainnet)
│       └── Cargo.toml
│
└── web/                                # Next.js frontend
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx              # Root layout with providers
    │   │   ├── page.tsx                # Marketing landing page
    │   │   ├── app/page.tsx            # Staking dashboard
    │   │   └── guide/page.tsx          # Staking tutorial
    │   ├── components/
    │   │   ├── landing/                # Landing page sections (Hero, Stats, Tokenomics, ...)
    │   │   ├── layout/                 # Header, navigation
    │   │   ├── staking/
    │   │   │   ├── Dashboard.tsx       # Active stakes, burn panel, history
    │   │   │   └── StakePanel.tsx      # Stake form
    │   │   ├── admin/
    │   │   │   └── AdminPanel.tsx      # Full admin control panel
    │   │   ├── referral/
    │   │   │   └── ReferralPanel.tsx   # Referral link & stats
    │   │   ├── market/
    │   │   │   └── TokenPriceWidget.tsx # FBiT price widget
    │   │   └── ui/
    │   │       └── ContractSetupNotice.tsx # Setup guidance banner
    │   ├── context/
    │   │   └── WalletContext.tsx       # Wallet state
    │   ├── hooks/
    │   │   ├── useContract.ts          # Unified contract interface
    │   │   └── useSolanaStaking.ts     # Solana reads/writes
    │   ├── lib/
    │   │   ├── config.ts               # Network configuration
    │   │   ├── store.ts                # Zustand global state (v6)
    │   │   ├── security.ts             # Rate limiting & validation
    │   │   ├── utils.ts                # Formatting helpers
    │   │   ├── reown.ts                # WalletConnect/Reown setup
    │   │   └── contracts/
    │   │       └── solana.ts           # Solana contract helpers
    │   ├── providers/
    │   │   └── AppKitProvider.tsx      # Reown AppKit wallet provider
    │   ├── idl/
    │   │   └── fbit_staking.ts         # Anchor IDL (TypeScript)
    │   ├── types/
    │   │   └── index.ts                # All TypeScript interfaces
    │   └── styles/
    │       └── globals.css             # Tailwind + custom CSS variables
    ├── .env.local                      # Active environment (gitignored)
    ├── .env.mainnet.example            # Mainnet env template
    ├── next.config.mjs
    ├── tailwind.config.js
    └── package.json
```

---

## 13. Environment Variables

All frontend configuration lives in `web/.env.local`:

```bash
# ===== ADMIN ACCESS =====
# SHA-256 hex digest(s) of the admin wallet address(es) — comma-separated. Never the
# raw address, so it can't be read directly out of the public JS bundle. Generate with:
#   node -e "console.log(require('crypto').createHash('sha256').update('YOUR_ADDRESS').digest('hex'))"
NEXT_PUBLIC_ADMIN_ADDRESS_HASHES=<sha256_hex_digest>

# ===== REOWN (WalletConnect) =====
NEXT_PUBLIC_REOWN_PROJECT_ID=<your_project_id>

# ===== SOLANA MAINNET =====
NEXT_PUBLIC_SOLANA_RPC_URL=https://solana-rpc.publicnode.com
NEXT_PUBLIC_SOLANA_PROGRAM_ID=<deployed_anchor_program_id>     # ⚠ Required
NEXT_PUBLIC_SOLANA_STAKE_TOKEN_MINT=5uJ8rkiqEs5uzERCqVw9a1eC6BkP54MZAF3D229dyoME
NEXT_PUBLIC_SOLANA_REWARD_TOKEN_MINT=5uJ8rkiqEs5uzERCqVw9a1eC6BkP54MZAF3D229dyoME
NEXT_PUBLIC_SOLANA_STAKE_VAULT=   # Optional — auto-derived from Program ID
NEXT_PUBLIC_SOLANA_REWARD_VAULT=  # Optional — auto-derived from Program ID
```

> **Note:** The app shows a `ContractSetupNotice` warning until `PROGRAM_ID` is filled in. All staking buttons are disabled until the contract is configured.

---

## 14. Deployment Guide

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Frontend |
| Rust | stable | Solana program compilation |
| Anchor CLI | 0.29+ | Solana framework |
| Solana CLI | 1.18+ | Wallet + deployment |

---

### A. Deploy Solana Program

```bash
cd contracts/solana
npm install

# Set Solana CLI to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# Build the Anchor program
anchor build

# Deploy to Solana Mainnet
anchor deploy --provider.cluster mainnet

# The output shows: "Program Id: <PROGRAM_ID>"
# Copy it into web/.env.local:
# NEXT_PUBLIC_SOLANA_PROGRAM_ID=<PROGRAM_ID>

# Also update Anchor.toml:
# [programs.mainnet]
# fbit_staking = "<PROGRAM_ID>"

# Initialize the platform PDA (run once after deploy)
npx ts-node scripts/initialize.ts
```

---

### B. Run the Frontend

```bash
cd web
npm install

# Copy and fill in your env
cp .env.mainnet.example .env.local
# Edit .env.local: add PROGRAM_ID

# Development server
npm run dev
# → http://localhost:3000

# Production build
npm run build
npm start
```

---

### C. Post-Deployment Checklist

- [ ] Solana program deployed and initialized
- [ ] `.env.local` has the deployed Program ID
- [ ] Admin panel accessible from admin wallet
- [ ] Deposit reward reserve: Admin → `depositReserve` with the reserve allocation
- [ ] Set annual emission: Admin → `setAnnualEmission`
- [ ] Configure Team Target Tiers: Admin → Sync All Tiers
- [ ] Fund active reward pool if needed: Admin → `fundRewardPool`
- [ ] Test stake / claim / compound / unstake end-to-end
- [ ] Renounce ownership when ready (irreversible!)

---

## 15. Technology Stack

| Layer | Technology |
|-------|-----------|
| Solana Contract | Rust + Anchor Framework 0.29 |
| Frontend Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| State Management | Zustand v5 (with localStorage persistence) |
| AI | `@anthropic-ai/sdk` (Claude Haiku) — bot detection + support chat |
| Solana SDK | `@solana/web3.js`, `@solana/spl-token`, `@coral-xyz/anchor` |
| Wallet Connection | Reown AppKit (formerly WalletConnect) |
| Supported Wallets | Phantom, Solflare, Backpack, Binance Web3 Wallet |
| Toast Notifications | `react-hot-toast` |
| Deployment | Vercel / any Node.js host |

---

## 16. Token & Contract Addresses

### FBiT Token — Solana Mainnet
```
5uJ8rkiqEs5uzERCqVw9a1eC6BkP54MZAF3D229dyoME
```
[View on Solana Explorer](https://explorer.solana.com/address/5uJ8rkiqEs5uzERCqVw9a1eC6BkP54MZAF3D229dyoME)

### FBiT Staking Program — Solana Mainnet
```
8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp
```
[View on Solana Explorer](https://explorer.solana.com/address/8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp)

---

## 17. Changelog

### v2.5 — August 2026

**New feature: single-sided SOL Liquidity provision with size-based auto-lock.** Added a full "Liquidity" tab to the `/app` dashboard letting anyone deepen the real FBiT/SOL trading pool using only SOL — no FBiT needed upfront. On deposit, half the SOL is swapped to FBiT via the existing Jupiter integration and both halves are added as a locked position on the live Meteora DAMM v2 pool; on withdraw, the FBiT leg is swapped back to SOL so the user only ever handles SOL going in and out. Built entirely as a client-side orchestration layer composing Jupiter's swap API with Meteora's own already-audited DAMM v2 instructions (`@meteora-ag/cp-amm-sdk`) — no new on-chain program, so no new custody surface for user funds.

- **Deposit-size-based lock schedule** (Permanent is always available as an alternative at any size): 1–10 SOL → 12 months, 10–50 → 24 months, 50–100 → 36 months, 100–250 → 48 months, 250–500 → 60 months, 500+ → 72 months. The UI auto-corrects the selected lock option if a typed amount crosses a tier boundary, and Permanent locks require typing "PERMANENT" to confirm before submitting — irreversible by design (Meteora's own `permanentLockPosition`, not custom logic).
- **Flat SOL platform fees**: 0.2 SOL on deposit, 0.5 SOL on withdrawal (both disclosed in the UI before confirming), on top of the existing 1% Jupiter Referral Program fee that already applies to the swap leg in either direction.
- **My Positions** panel shows locked value, lock type, unlock countdown, and claimable trading fees per position, with one-click Claim and Compound (claim + immediately re-add as liquidity in a single transaction).
- Found and fixed two real bugs during this build before it ever touched a real position: `liquidity.ts`'s fee routing didn't account for the staking contract's renounce-ownership state (would have sent fees to a stale authority instead of `fee_recipient` post-renouncement), and the vesting-unlock countdown read `cliffPoint` from the wrong field path (Meteora nests it under `innerVesting.cliffPoint`, not a direct field) — would have shown `NaN` for every timed position's countdown.

**On-chain price/liquidity display fixed — was silently showing a stale, wrong price.** The landing page's live price widget fell back to a search-based GeckoTerminal query whenever the pinned pool's own price came back as `0.0` (a falsy value in the existing filter, even though `0.0` legitimately meant "real pool, just not yet indexed with trades") — surfacing a stale $0.5103 price and $0 liquidity from a different, nearly-empty pool instead of the real pool's numbers. Fixed by computing price and liquidity directly from the pool's on-chain vault balances (SOL/USD sourced from GeckoTerminal's dedicated SOL price endpoint, which is reliable) as the first attempt, ahead of the GeckoTerminal pool-search chain, which remains only as a fallback. Verified live: price corrected from $0.5103 to $0.1062, liquidity from $0 to $35.15K, market cap from $127.58M to $26.54M.

**Full-system security review — two more real issues found and fixed proactively**, beyond the Liquidity-feature bugs above:

- `NEXT_PUBLIC_SITE_URL` in the Vercel production environment was still pointing at the pre-migration `stake.futurebit.in` domain, causing the origin-allowlist check (`isAllowedOrigin()`) to reject legitimate requests from the actual primary domain (`futurebit.in` and `www.`) — silently breaking the AI support chat and bot-detection API for most real visitors. Fixed by updating the env var to the bare `futurebit.in` (its subdomain-match logic then covers all three domains) and redeploying.
- Mobile wallet connections were failing intermittently — root-caused to `Cross-Origin-Opener-Policy`/`Cross-Origin-Resource-Policy` headers in `vercel.json` that broke the WalletConnect/OAuth popup flow (a documented class of issue; `next.config.mjs` already deliberately avoids any CSP-adjacent header for this exact reason, but `vercel.json` had added them independently). Removed both headers.
- Binance Web3 Wallet's in-app DApp browser has its own known failure mode: it injects a Wallet Standard Solana provider directly, but the connect modal's featured WalletConnect entry (also labeled "Binance") tried to deep-link back out to relaunch the app the user was already inside. Added detection for this environment (`isInsideBinanceAppBrowser()`) that removes the conflicting featured entry and shows a toast guiding the user to the auto-detected "Installed" wallet instead. Confirmed fixed by the user on a real device.

**Reserve topped up 110,000,000 FBiT, tokenomics resynced everywhere.** The emission reserve was funded with an additional 110,000,000 FBiT (bringing it to 229,830,025.87 FBiT, ~19-year runway at the current 12,000,000/year emission rate), and every tokenomics display — landing page allocation chart, whitepaper (overview, §7.1, §11.5, §13.2, §13.3), and this README — was updated to the resulting 91.9% Staking Reserve / 8.1% Liquidity split.

**Smaller fixes**: added the missing "How It Works" nav link on the landing page header; made the About/Terms/Privacy page headers use the real FBiT logo instead of a generic gradient icon; added X and Telegram social links to the landing page footer (Telegram handle corrected to `@FutureBit_Community` after verification).

### v2.4 — August 2026

**Fixed a critical referral self-dealing exploit and added the "referrer must have staked" rule.** An internal security review of the full contract found that `register_user` accepted any pubkey as `referrer` with no on-chain check that it belonged to a real, existing account — so two colluding wallets could register with each other as referrer (`A→B`, `B→A`), forming a 2-node cycle. Because `stake()`'s referral-chain walk had no cycle guard, staking from either wallet would then alternate through the cycle across all 10 referral levels, paying the staker's own wallets back the vast majority of the referral percentage (up to ~29% of every stake) straight out of the shared reward pool — a direct fund-drain, plus it inflated `team_total_staked` enough to fake Team Target Bonus tiers. Fixed at the root: `register_user` now takes a `referrer_account` and requires it to be the referrer's own UserAccount PDA with `total_staked > 0` — the referrer must have registered *and* staked before their link can onboard anyone, which makes a cycle temporally impossible to construct (a referrer must always precede their referee). Added a matching defense-in-depth guard in `stake()`'s referral loop (breaks if the staker ever appears in their own chain) and a new `ReferrerNotActive` error. Updated `solanaRegisterUser` (client) to validate this ahead of time with a friendly error message, and the IDL to document the new account. Deployed to mainnet via `solana program extend` (+10,240 bytes) followed by `solana program deploy`.

### v2.3 — August 2026

**Deployed the last pending cleanup instructions and fully retired stale accounts.** `close_user_account`/`close_stake_entry` (written and build-verified back in v2.1, deferred only for lack of SOL in the admin wallet — cosmetic only, no security impact) were upgraded to mainnet (no `solana program extend` needed this time — allocated program space already covered the new binary) and run against every account on-chain via two new scripts, `close-user-accounts.ts` and `close-stake-entries.ts`. Closed all 16 empty UserAccount PDAs and all 29 inactive StakeEntry accounts left over from the pre-migration cleanup, reclaiming their rent to the admin wallet. `Platform.total_users` now accurately reads 1 (the admin's own still-active account) instead of the stale 17.

### v2.2 — August 2026

**Referral commission mismatch fixed — frontend/docs said 30%, live contract pays 17.75%.** Queried the mainnet Platform account's `referral_percentages` field directly and found it no longer matches the contract's `DEFAULT_REFERRAL_PERCENTAGES` (30% total) set at `initialize()` — at some point an admin called `set_referral_percentages` to a lower, evenly-stepped curve (0.25% → 3.00% per level, 17.75% total) that was never reflected outside the app's own live-data-aware components. The in-app Referral tab was already correct (it fetches live `Platform.referralPercentages` and only falls back to a static constant when that fetch fails), but the landing page's Rewards section, both FAQ copies (visible + structured data), Features grid, Terms page, AI support chat's system prompt, the marketing PDF, the whitepaper, and this README's own reference tables all still quoted the old 30% figure and per-level breakdown. Updated every one of them to 17.75%, and updated the two fallback constants (`REFERRAL_LEVELS` in `types/index.ts`, `REFERRAL_BPS` in `lib/contracts/solana.ts`) so the safety-net values match reality too, not just the always-correct live path.

### v2.1 — August 2026

**Critical security fix — orphaned pre-migration stakes could drain the reserve.** After the v2.0 mint migration, 19 StakeEntry accounts created under the *old* mint were still `is_active = true` with their lock periods long expired. `unstake()`/`claim_rewards()`/`compound_rewards()` only validate that the supplied vault matches the platform's *current* mint — they never check which mint an entry was originally staked under — so any of those 19 entries could call `unstake()` against the new shared stake/reward/reserve vault and receive real new-mint FBiT they never deposited under the new mint. The platform was paused immediately as a stopgap the moment this was found, then fully resolved:

- **Three new admin instructions**, all hard-scoped to never touch live funds: `burn_stale_vault` (burns and closes a vault only if its mint differs from *both* the current stake and reward mint — cannot target the live vault), `void_stale_stake` (force-deactivates a StakeEntry without moving tokens), `reset_user_account` (zeroes a UserAccount's accumulated stats and referrer link)
- **Cleanup executed on mainnet**: burned 228,334,553 orphaned old-mint FBiT from the old reserve vault and closed it; voided all 19 stale StakeEntry accounts; reset all 17 registered UserAccounts to a clean slate (stats and referrer links)
- **`close_user_account`** added afterward to fully retire the now-empty UserAccount PDAs (reclaiming rent, decrementing `total_users`) rather than leaving zeroed-but-still-registered accounts behind
- The platform was unpaused once the exploit path was fully closed and verified — normal staking/claiming/unstaking/compounding is live again. A follow-up pass also cleared the `referrer` link on all 17 test accounts (not just their stats) for a genuinely clean slate; two more cosmetic-only cleanup instructions (`close_user_account`, `close_stake_entry` — retire the now-empty accounts and reclaim their rent) are written and build-verified but not yet deployed, with no security impact either way

**Renounce-ownership fee simplified.** The separate 25%-of-gross fee paid to `fee_recipient` after renouncement is gone. The same 1% platform fee that always applied on stake/unstake/claim/compound now just keeps applying after renouncement too — it routes to `fee_recipient` instead of the former authority, rather than being waived in favor of a bigger one-off cut. Removes an entire extra transfer and required account (`fee_recipient_token_account`) from claim/compound.

**Dead code removed**: `set_reward_rate`/`reward_rate` was never read by any reward calculation (rewards are driven by `annual_emission`/`total_staked` via `get_effective_apy_bps`, not this field) — the setter instruction was removed and its Admin Panel UI replaced with an honest explanation. `referral_reward_rate`'s Admin Panel control was similarly rebuilt as a plain ON/OFF toggle — the contract only checks whether it's zero or non-zero to gate the whole 10-level referral system; the specific numeric value it held was never meaningful.

**Frontend bug hunt — several panels never synced live data on their own.** Dashboard and the Stake tab already fetched fresh on-chain platform stats on mount; Admin Panel, Referral Panel, and the Calculator tab did not — they only ever showed real numbers after some *other* tab's sync call happened to run first in the same session, otherwise silently showing zero/default values (Reserve, Annual Emission, Releasable Now, live referral percentages, and team tiers all affected). All three now sync on mount and on a refresh interval, matching the existing Dashboard/Stake pattern.

**Root cause of the recurring "shows 0 instead of the real value" reports**: `networkPlatformStats` was being persisted to `localStorage` via Zustand's `persist` middleware. A stale cached number — from an older contract deploy, an old on-chain config, or simply a background sync that failed silently — would sit there looking authoritative indefinitely instead of being replaced by a fresh fetch. Stopped persisting it entirely; every page load now starts from neutral defaults and gets corrected by a live fetch within moments, closing the whole class of bug (this had separately caused wrong Min/Max stake limits, a stale Annual Emission figure, and a stale Total Burned figure, all fixed piecemeal before the root cause was found).

**On-chain burn rate corrected to match the frontend's displayed 10%** — a client-side "migration" workaround had been silently overriding a genuine on-chain `burn_bps` of 2,500 (25%) to display 1,000 (10%) instead, meaning users were told 10% while 25% of their reward was actually being burned on every claim. Fixed on-chain via `set_burn_bps(1000)` rather than making the display honest about the wrong value.

**IDL/contract drift fixed**: the frontend's hand-written IDL still said "Claim too early - wait 12 hours" for an error the contract actually enforces at 6 hours (`CLAIM_INTERVAL = 21600`) — a leftover from an earlier contract version.

**Deployment/tooling notes**: Vercel's production environment variables for the Solana mint/vault addresses were 95 days stale (still pointing at the pre-migration mint) despite the app code being current — env vars aren't part of a git deploy and have to be updated separately. Also hit and resolved a stale-build-cache Vercel deployment failure, and a Solana protocol quirk where extending a program's on-chain size requires a minimum 10,240-byte increment per `solana program extend` call (the `anchor upgrade` CLI doesn't request this automatically when the actual size delta is smaller).

### v2.0 — August 2026

**Platform is now Solana-only** across the contract, frontend, and documentation.

- **Solana mainnet migration executed** — the staking program was upgraded in place (same Program ID, `8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp`) to a new fixed-supply FBiT SPL mint (9 decimals, 250,000,000 supply, mint authority renounced); the 120,000,000 FBiT emission reserve was funded, the annual emission rate was set to 12,000,000 FBiT/year, and all 10 Team Target Bonus tiers were pushed on-chain
- **Critical fix: emission release could freeze permanently** — `release_emission` computed "tokens releasable so far" by applying the *current* annual emission rate across the *entire* elapsed time since the reserve was first funded. Any future rate change (e.g. via `set_annual_emission`, or the now-removed halving) would retroactively undercut that total below what had already been released, permanently reverting every subsequent release call. Fixed by tracking an incremental `last_release_time` instead — each call only ever applies the current rate to time elapsed since the last release
- **New `reset_platform_stats` admin instruction** — a token-mint migration repoints the mint pubkeys but was leaving `total_staked`, `total_reserve`, `reward_pool_balance`, `total_burned`, and the emission clock as stale numbers denominated in the old mint's tokens/decimals; this instruction gives a clean, one-time reset after a migration so those counters can't corrupt reward-pool and emission math against the new (empty) vaults
- **Halving mechanic removed** — `trigger_halving` and the automatic 4-year base-APY/emission halving are gone; annual emission is admin-adjustable via `set_annual_emission` only. The now-unused `halving_epoch`/`halving_start_time` fields are kept in the account layout (backward-compatible byte offsets) but are otherwise inert
- **Team Target Bonus tiers rescaled** — Bronze now starts at 50,000 FBiT (was 2,500 after an earlier rescale, originally 50,000 FBiT pre-decimal-migration); Titan tops out at 100,000,000 FBiT / 40% of supply (previous top tiers of 500M–1B FBiT were mathematically unreachable against the 250M fixed supply)
- **Solana build hygiene** — `overflow-checks = true` and the `idl-build` feature are now required for a clean `anchor build`, matching current Anchor CLI expectations
- **New marketing landing page** at `/` — live protocol stats, token info, tokenomics breakdown, security/trust section, roadmap, 10-level referral and Team Target Bonus tables, FAQ, and a Canvas-based particle-globe hero animation; the original tabbed dashboard moved to `/app`. Added a step-by-step staking tutorial at `/guide`
- **Admin login hint removed** — the visible "⚙ Admin Login" button and confirmation modal are gone; admin status now auto-detects silently whenever any wallet connects through the normal Connect flow (this already worked under the hood — the separate admin path was redundant, and it was the only place an admin backdoor was hinted at)
- **Admin address hashed, not stored raw** — `NEXT_PUBLIC_ADMIN_ADDRESS_HASHES` (SHA-256 digests) replaces `NEXT_PUBLIC_ADMIN_ADDRESSES`, so the admin wallet can no longer be read directly out of the public JS bundle
- **Bot-assess fail-open bypass closed** — rate-limit, bad-origin, and malformed-request failures on `/api/bot-assess` now return `risk: "medium"` instead of the old blanket `risk: "low"`, so a bot can't force a guaranteed-safe verdict by deliberately tripping one of those checks; genuine Anthropic API outages still fail open so real users are never blocked. Added a global per-instance rate cap to both AI API routes as a backstop against distributed abuse
- **`sanitizeText` nested-tag bypass fixed** — HTML-stripping now runs to a fixed point instead of a single pass, closing a bypass via malformed markup like `<<script>script>`
- **Dependency vulnerability patches** — `uuid`, `axios`, and `image-size` pinned via `overrides` to resolve a High-severity buffer-overflow CVE in the Solana RPC client chain and several Axios/image-size advisories (37 → 15 remaining locally, all in unreachable/low-risk transitive paths)
- **Brand simplified to "FutureBit"** across the site (was "Future Bit (FBiT) Staking Mainnet")
- **Buttons restyled** to Solana's official purple → green gradient (`#9945FF` → `#14F195`)

### v1.7 — July 2026

- **AI Support Chat** — New floating widget (`web/src/components/chat/SupportChat.tsx`) backed by a rate-limited `/api/support-chat` route using Claude Haiku, scoped strictly to platform facts (APY, referrals, safety)
- **New static pages** — `/about`, `/terms`, `/privacy`, linked from the footer
- **Ad placements** — Coinzilla/Adcash integration (`AdsManager.tsx`) driven entirely by `NEXT_PUBLIC_ADS_*` env vars; the Admin Panel's Ads tab is a read-only status view (there is no backend database, so a live in-panel toggle would only ever affect the admin's own browser via `localStorage`, never real visitors — this was in fact a live bug, fixed this cycle)
- **SEO overhaul** — full metadata, sitemap, robots.txt, Schema.org structured data (Organization/WebSite/WebApp/FAQ), Google Search Console verification, dynamic OG image
- **New brand logo** — header and footer updated
- **Wallet connect fix** — `@reown/appkit`, `-adapter-ethers`, and `-adapter-solana` were resolving to two different versions (1.8.19 vs 1.8.21) because npm couldn't dedupe them, so the Solana adapter ran against a separate copy of AppKit's internal connection state than the rest of the app — this produced Phantom's "Connection declined — a previous request is still active" error on every connect attempt. Pinned all three to `1.8.21` with an override. Also removed a redundant, manually-registered Phantom/Solflare adapter that competed with AppKit's own Wallet Standard auto-detection for the same installed extension.
- **Production origin-check bug** — `NEXT_PUBLIC_SITE_URL` in Vercel was malformed (bare hostname plus a stray literal `\n`), so the Origin-allowlist check in `/api/bot-assess` silently 403'd every real request in production — meaning the Claude bot-detection layer had likely never actually run in production (it fails open, so this went unnoticed). Added `isAllowedOrigin()` in `lib/security.ts` which normalizes hostnames regardless of scheme/formatting.
- **Unsolicited wallet signature fix** — the auto-halving check in `syncPlatformStats()` called `triggerHalving()` for *any* connected wallet once a halving became due, prompting a surprise signature request for ordinary visitors; now gated to admin wallets only
- **Stake amount precision fixes** — the Stake page's MAX/25%/50% quick-fill buttons used `toFixed(0)` which could round *up* past the actual wallet balance (now `Math.floor`); the reward estimate used a double-rounded whole-percent APY instead of the raw basis-points value, causing it to diverge from the Dashboard's live figures
- **Referral level off-by-one** — the on-chain history feed displayed the contract's 0-based `ReferralReward` level index verbatim while the rest of the app is 1-based, showing every referral one level lower than actual
- **Admin emission cap mismatch** — the Annual Emission input capped at 1,000,000 FBiT while the on-chain contract allows a much higher ceiling, so the built-in APY calculator's own quick-fill values were sometimes rejected by the form that generated them
- **Dependency vulnerability patches** — resolved a critical `shell-quote` CRLF injection and several high/moderate advisories (`@babel/core`, `form-data`, `ws`) across the web app and contract tooling via `npm audit fix`
- **Corrected referral total in SEO/FAQ content and the support chat** — was incorrectly stated as 15.75%; the real total across all 10 levels is 30%
- **Known limitation (not fixed — flagged for a deliberate decision):** the contract checks the per-user stake cap only against each individual `stake()` call, never the user's cumulative `total_staked`. A user can bypass the intended ceiling by splitting a large stake across multiple calls. Fixing this requires a new contract version and a migration plan for existing stakers — out of scope for a routine patch on a live mainnet contract holding real funds.
- **New Swap tab** (`SwapPanel`) — custom SOL ↔ FBiT swap UI built directly on Jupiter's Quote/Swap API, with a live GeckoTerminal price chart alongside it
- **New Staking Calculator tab** — projects claim-only vs compound rewards for a chosen amount/APY/duration, no wallet connection required
- **New `UsdValue` component** — live "~ $X" estimate shown next to FBiT amounts across Dashboard, Stake, History, Referral, Admin, and the calculator
- **Admin panel: Blocked Users list** — count + per-address Unblock button (via a discriminator-filtered `getProgramAccounts` scan); the Ads Management tab was removed
- **Nav reordered and code-split** — Dashboard → Swap → Stake → Referral → Calculator → History; every tab now loads via `next/dynamic` so switching tabs only pulls in that tab's JS
- **Referral persistence fix** — referrer resolution no longer gets wiped out by a malformed `?ref=` URL param
- **Claim/compound fee-recipient fallback fix** — a failed platform-state fetch now aborts before signing instead of silently defaulting the fee recipient to the user's own wallet
- **Solana RPC rate-limiting storm fix** — history fetchers now batch `getParsedTransactions` (chunks of 50) instead of 100–200 individual calls, and space queued RPC requests ~120ms apart, eliminating repeated 429s from the Helius free tier
- **Price feed fix** — the confirmed-correct FBiT/SOL pool is now pinned to the front of the price list regardless of liquidity ranking
- **Dependency updates** — `@reown/appkit` + adapters, React, Tailwind, Recharts, Zustand and others bumped to latest compatible versions
- **Support contact email** updated to `contact@futurebit.in` across Terms, Privacy Policy, and [SECURITY.md](SECURITY.md)

---

## License

MIT — Free to use, modify, and distribute.

---

*Built for the FBiT ecosystem on Solana. Autonomous, deflationary, non-custodial.*
