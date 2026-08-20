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
| Referral Total | 30% distributed across all 10 levels |
| Team Bonus | Up to +10% on top of staking rewards |
| Network | Solana Mainnet |
| Platform Fee | 1% on all operations (removed after ownership renouncement) |
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
| 5 | 2.00% | Level 5 upline |
| 6 | 3.25% | Level 6 upline |
| 7 | 3.50% | Level 7 upline |
| 8 | 4.25% | Level 8 upline |
| 9 | 5.50% | Level 9 upline |
| 10 | 8.00% | Level 10 upline |
| **Total** | **30.00%** | Distributed instantly on stake |

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

1. **Admin deposits** the full reserve allocation once (120,000,000 FBiT).
2. The contract **automatically releases** `ANNUAL_EMISSION` tokens per year from the reserve into the active reward pool.
3. Target: **12,000,000 FBiT/year** → an approximately 10-year nominal runway.
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

The Admin Panel is accessible only to wallet addresses listed in `NEXT_PUBLIC_ADMIN_ADDRESSES`. It provides:

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
# Solana wallet addresses that can access the Admin Panel
NEXT_PUBLIC_ADMIN_ADDRESSES=<solana_address>

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

> These entries are a historical record and are left as originally written, including references to the Polygon deployment that was part of the platform at the time. The platform is Solana-only as of the most recent entries below.

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
- **Referral level off-by-one** (legacy Polygon deployment) — the on-chain history feed displayed the contract's 0-based `ReferralReward` level index verbatim while the rest of the app is 1-based, showing every referral one level lower than actual
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

### v1.6 — May 2026 *(legacy Polygon deployment era)*

- Binance Web3 Wallet support added via Reown WalletConnect
- 3-layer Solana wallet resolution — `getSolanaWallet()` uses AppKit's `subscribeProviders` provider first, then address-matched browser extension, then legacy fallback — prevents Phantom from intercepting WalletConnect sessions
- Connected address tracking — `subscribeAccount` in Reown tracks the connected Solana address to verify extension wallets match the user's chosen account
- New Vercel deployment — migrated to fresh project at [stake-futurebit.vercel.app](https://stake-futurebit.vercel.app) with all environment variables configured
- WalletConnect fix — resolved "WalletConnect is not available" error caused by missing `NEXT_PUBLIC_REOWN_PROJECT_ID` on Vercel
- Binance wallet featured in Reown modal for quick discovery

### v1.5 — May 2026 *(legacy Polygon deployment era)*

- **History Panel** — New dedicated Activity History tab showing on-chain + local transaction records with summary stats (Total Staked, Unstaked, Claimed, Compound, Referral Earned, Team Bonus)
- **8 decimal places** — All FBiT token amounts now display with 8 decimal places throughout the UI
- **Loading indicator** — History panel shows "Loading data from chain..." while syncing
- **`userAccount.totalStaked`** — History panel Total Staked now reads directly from the contract's user struct (most reliable source)
- **Live APY calculator** — Admin Panel Annual Emission section shows real-time APY preview as admin types a new emission value

### v1.4 — April 2026 *(legacy Polygon deployment era)*

- **MAX APY reduced** — changed to a 250% cap for sustainable tokenomics on that deployment
- **Bot Management System** — Multi-layer bot detection (fingerprinting, behavioral analysis, TF.js Layer 7, Claude AI Layer 8)
- **Security hardening** — Rate limiting, input validation, HTTP headers, API keys removed from codebase
- **Zustand store v5** — Upgraded from v4 to force fresh state after breaking changes

### v1.3 — March 2026 *(legacy Polygon deployment era)*

- Multi-chain wallet connection
- Auto network switch on wallet connect
- Referral Panel with 10-level commission tracking
- Admin Panel with full on-chain controls
- Landing page removed — DApp at root route

---

## License

MIT — Free to use, modify, and distribute.

---

*Built for the FBiT ecosystem on Solana. Autonomous, deflationary, non-custodial.*
