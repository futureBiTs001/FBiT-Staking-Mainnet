# Future Bit (FBiT) Staking Platform — Whitepaper

> **Version 1.0 · May 2026**
> Dual-Chain Staking Protocol on Polygon & Solana

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Introduction](#2-introduction)
3. [Token Overview](#3-token-overview)
4. [Platform Architecture](#4-platform-architecture)
5. [Staking Mechanics](#5-staking-mechanics)
6. [Reward & APY Model](#6-reward--apy-model)
7. [Emission & Reserve System](#7-emission--reserve-system)
8. [Burn Mechanism](#8-burn-mechanism)
9. [Referral Program (10-Level)](#9-referral-program-10-level)
10. [Team Bonus Tier System](#10-team-bonus-tier-system)
11. [Security Architecture](#11-security-architecture)
12. [Smart Contract Addresses](#12-smart-contract-addresses)
13. [Tokenomics](#13-tokenomics)
14. [Roadmap](#14-roadmap)
15. [Conclusion](#15-conclusion)

---

## 1. Executive Summary

**Future Bit (FBiT) Staking** is a decentralized, dual-chain staking protocol deployed on **Polygon (EVM)** and **Solana**. The platform allows token holders to stake WFBIT / FBiT tokens and earn dynamic Annual Percentage Yields (APY) ranging from **60% to 250%**, compoundable every 6 hours.

Beyond simple staking, FBiT introduces a **10-level deep referral system** and a **10-tier team bonus structure** that rewards community builders with additional on-chain bonuses. The protocol features a fully audited smart contract with a long-term **800-year emission reserve** that guarantees reward sustainability without centralized re-funding.

Key highlights:
- Up to **250% APY** (dynamic, PoS-based)
- **30-day lock period** with 6-hour claim intervals
- **10-level referral rewards** totaling up to ~30% passive income
- **10-tier team bonus** (Bronze → Titan) up to +10% additional APY
- **800,000,000 WFBIT reserve** — 800-year emission runway (at 1M/year)
- **Deflationary burn** on every claim, compound, and unstake
- Deployments live on **Polygon Mainnet** (Chain ID 137) since May 2, 2026

---

## 2. Introduction

The decentralized finance (DeFi) ecosystem has grown rapidly, but most staking protocols offer only flat, unsustainable APYs without any network-growth incentive built in. Future Bit Staking addresses these limitations with:

1. **Dynamic APY** — yield adjusts automatically based on on-chain conditions (min 60%, max 250%), ensuring long-term sustainability.
2. **Multi-level referral architecture** — 10 levels of passive referral income that incentivize organic growth without off-chain pyramids.
3. **Team-based tier bonuses** — users who build larger staking teams unlock bonus yields, aligning individual incentives with platform growth.
4. **Deflationary token supply** — a burn mechanism on every transaction reduces circulating supply over time.
5. **Transparent emission schedule** — a fixed annual emission from an on-chain reserve vault means no surprise minting or re-funding events.

The platform is built on battle-tested OpenZeppelin smart contracts and has undergone an audit with four critical fixes applied prior to mainnet deployment.

---

## 3. Token Overview

### 3.1 WFBIT — Wrapped Futurebit (Polygon)

| Property         | Value                                                              |
|------------------|--------------------------------------------------------------------|
| **Name**         | Wrapped Futurebit                                                  |
| **Symbol**       | WFBIT                                                              |
| **Decimals**     | 6                                                                  |
| **Total Supply** | 1,000,000,000 WFBIT (1 Billion)                                   |
| **Network**      | Polygon Mainnet (Chain ID 137)                                     |
| **Contract**     | `0xa31b5A95268CAd709e6691Ec2F2F107A3F36D945`                       |
| **Standard**     | ERC-20                                                             |
| **Verified**     | Polygonscan + Sourcify                                             |

WFBIT serves as both the **stake token** and the **reward token** on the Polygon chain. This single-token design means all staking rewards are paid in the same asset users stake, eliminating impermanent loss from reward token divergence.

### 3.2 FBiT SPL Token (Solana)

| Property         | Value                                                              |
|------------------|--------------------------------------------------------------------|
| **Symbol**       | FBiT                                                              |
| **Decimals**     | 6                                                                  |
| **Network**      | Solana Mainnet                                                     |
| **Mint Address** | `CuubBzUTnQ4H2D2fHJCVWGEUEod2fJzq4nAPwfx8UGTu`                   |
| **Standard**     | SPL Token                                                          |

FBiT on Solana mirrors the WFBIT token on Polygon, enabling a consistent staking experience across both chains. The Solana program is built using the **Anchor framework** and uses Program Derived Addresses (PDAs) for trustless vault management.

---

## 4. Platform Architecture

### 4.1 Dual-Chain Design

FBiT Staking operates across two independent but functionally equivalent chains:

```
┌─────────────────────────────────────────────────┐
│              FBiT Staking Frontend               │
│         (Next.js · Vercel · AppKit)              │
└──────────────┬──────────────────┬────────────────┘
               │                  │
    ┌──────────▼──────────┐  ┌────▼──────────────────┐
    │   Polygon Mainnet   │  │    Solana Mainnet      │
    │   (Chain ID 137)    │  │   (Anchor Program)     │
    │                     │  │                        │
    │  FBiTStaking.sol    │  │  fbit_staking.so       │
    │  ERC-20 WFBIT       │  │  SPL FBiT Token        │
    └─────────────────────┘  └────────────────────────┘
```

Users select their preferred chain from the frontend. Both chains support the complete feature set: staking, claiming, compounding, unstaking, referrals, and team bonuses.

### 4.2 Polygon Smart Contract

The Polygon contract (`FBiTStaking.sol`) is an audited Solidity contract built on OpenZeppelin's `Ownable`, `Pausable`, and `ReentrancyGuard` libraries. It handles:
- User registration with optional referrer
- Multi-position staking (one user can hold multiple stake entries)
- Locked APY snapshots at stake time
- 10-level referral reward distribution on each claim
- Team bonus calculation and application
- Annual emission release from the reserve vault

### 4.3 Solana Program

The Solana program is built with the **Anchor framework** using PDAs for all vaults:
- **Platform PDA** — global state (total staked, users, config)
- **User PDA** — per-user account (stakes, referrer, team info)
- **Stake Entry PDA** — individual stake records (seeds: `["stake", owner, timestamp]`)
- **Stake Vault** — token account holding staked tokens
- **Reward Vault** — token account holding reward tokens
- **Reserve Vault** — long-term emission reserve

### 4.4 Frontend

The web application is built with **Next.js 14 (App Router)** and deployed on **Vercel**. Wallet connectivity is provided by:
- **Reown AppKit** (formerly WalletConnect) for EVM wallets (MetaMask, etc.)
- **Solflare SDK + Solana Wallet Standard** for Solana wallets (Phantom, Solflare, etc.)

---

## 5. Staking Mechanics

### 5.1 How to Stake

1. **Connect Wallet** — Connect MetaMask (Polygon) or Phantom/Solflare (Solana).
2. **Register** — Call `registerUser(referrer?)`. One-time, free, optional referrer address.
3. **Approve** — Approve the staking contract to spend your WFBIT/FBiT tokens.
4. **Stake** — Call `stake(amount)`. The amount is locked for 30 days.

Each stake call creates a new **stake entry** with a unique ID. Users can hold multiple active stakes simultaneously.

### 5.2 Lock Period

| Parameter         | Value      |
|-------------------|------------|
| Lock Duration     | **30 Days**|
| Early Unstake     | Not allowed (funds locked until `unlockAt`) |
| Unlock Condition  | `block.timestamp >= unlockAt`               |

The `unlockAt` timestamp is set at stake time: `stakedAt + 30 days`. Once unlocked, users may call `unstake(stakeId)` to withdraw their principal plus any unclaimed rewards.

### 5.3 Claim Interval

Rewards accrue per completed **6-hour interval** (4 intervals per day). Users may call `claimRewards(stakeId)` once every 6 hours.

| Parameter           | Value                                      |
|---------------------|--------------------------------------------|
| Claim Interval      | **6 hours** (21,600 seconds)               |
| Claims per Day      | 4 (maximum)                                |
| Minimum Wait        | Must complete at least 1 full 6h interval  |

### 5.4 Compounding

Calling `compoundRewards(stakeId)` automatically:
1. Calculates pending rewards for the stake entry
2. Applies the burn fee on the reward amount
3. Adds net rewards back into the principal stake
4. Resets the claim timer

Compounding increases the effective yield over time through exponential growth.

### 5.5 Unstaking

After the 30-day lock expires:
1. All pending rewards are calculated and claimed
2. The burn fee is applied to the reward portion
3. The principal is returned to the user
4. The stake entry is marked inactive

---

## 6. Reward & APY Model

### 6.1 Dynamic APY

FBiT uses a **Proof-of-Stake style dynamic APY** that fluctuates between a minimum and maximum:

| Parameter   | Value                    |
|-------------|--------------------------|
| Minimum APY | **60%** (6,000 BPS)      |
| Maximum APY | **250%** (25,000 BPS)    |
| APY Unit    | Basis Points (BPS), where 10,000 BPS = 100% |

The effective APY (`getEffectiveAPY()`) is computed on-chain based on current platform conditions. When a user stakes, their APY is **locked in** at that moment — this means early stakers lock in higher APYs if the platform has more rewards available relative to total staked.

### 6.2 Reward Calculation Formula

```
reward per 6h interval = (stakedAmount × APY_BPS / 10,000) / 1,460

where 1,460 = 4 intervals/day × 365 days
```

**Example:** 10,000 WFBIT staked at 250% APY:
- Annual reward = 10,000 × 2.50 = 25,000 WFBIT
- Per 6h interval = 25,000 / 1,460 ≈ 17.12 WFBIT

### 6.3 Team Bonus on Rewards

When claiming or compounding, the contract also calculates a **team bonus** based on the user's current team tier. This bonus is added on top of the base staking reward (see Section 10 for tier details).

---

## 7. Emission & Reserve System

FBiT's long-term sustainability is guaranteed by an **on-chain reserve vault** that releases tokens into the reward pool at a fixed annual rate.

### 7.1 Reserve Vault

| Parameter              | Value                                    |
|------------------------|------------------------------------------|
| Total Reserve Deposited | **800,000,000 WFBIT**                   |
| Annual Emission Rate   | **1,000,000 WFBIT / year**               |
| Emission Runway        | **~800 years** at current rate           |
| Emission Start Date    | **May 2, 2026**                          |

The reserve is held in a separate vault from the active reward pool. This design ensures:
- The reward pool cannot be accidentally over-spent
- Emission is transparent and verifiable on-chain at all times
- No trusted party can re-mint or inflate tokens

### 7.2 Emission Release

Anyone can call `releaseEmission()` to move releasable tokens from the reserve into the active reward pool. The releasable amount is proportional to time elapsed since the last release:

```
releasable = (now - lastReleaseTime) × ANNUAL_EMISSION / 365 days
```

The contract enforces that releases cannot exceed the total reserve balance. `getReleasableEmission()` and `getRemainingYears()` are public view functions providing full transparency.

### 7.3 Reward Pool

The active reward pool (`rewardPoolBalance`) is what pays out staking rewards, referral commissions, and team bonuses. It receives tokens from:
1. The emission release mechanism (primary, automated)
2. Direct funding by the platform (`fundRewardPool`) for bootstrap liquidity

---

## 8. Burn Mechanism

FBiT incorporates a **deflationary burn** that permanently removes tokens from circulation on every staking event.

### 8.1 Transaction Burn

A **BURN_BPS** fee (configurable, capped by `MAX_BURN_BPS`) is deducted from the reward/principal on:

| Action        | Burn Applied To             |
|---------------|-----------------------------|
| `claimRewards`  | Reward amount               |
| `compoundRewards` | Reward amount (before compounding) |
| `unstake`       | Reward amount at unstake    |

The burn tokens are sent to the zero address (`0x000...dead`) and tracked in the `totalBurned` counter.

### 8.2 Year-End Pool Burn

The platform can call `burnUnusedPool(amount)` to burn excess tokens from the reward pool at the end of each year. This prevents reward pool inflation and applies additional deflationary pressure. Events emitted: `UnusedPoolBurned(burnAmount, totalYearlyBurned, remainingYears)`.

---

## 9. Referral Program (10-Level)

FBiT's referral system is one of its most distinctive features. When a user registers with a referrer address, a 10-level referral chain is established on-chain.

### 9.1 How Referrals Work

1. User A stakes tokens.
2. On each `claimRewards` or `compoundRewards`, the contract traverses User A's 10-level referral chain.
3. Each ancestor in the chain receives a percentage of User A's reward as a **referral bonus**, paid from the reward pool.
4. If the reward pool has insufficient balance for a referral payment, the `ReferralSkipped` event is emitted (no failure, graceful degradation).

### 9.2 Referral Commission Table

| Level | Percentage |
|-------|-----------|
| 1     | **0.25%** |
| 2     | **0.50%** |
| 3     | **1.25%** |
| 4     | **1.50%** |
| 5     | **2.00%** |
| 6     | **3.25%** |
| 7     | **3.50%** |
| 8     | **4.25%** |
| 9     | **5.50%** |
| 10    | **8.00%** |
| **Total** | **~30.0%** |

Percentages are applied to each claimant's **reward amount**, not their stake principal. They are paid from the reward pool, not deducted from the claimant.

### 9.3 Referral Chain Rules

- A referrer must be a **registered user** at the time of referral registration.
- The referral chain is stored on-chain and immutable after registration.
- `getReferralChain(user)` returns the full 10-address chain.
- `getReferrals(user)` returns direct (Level 1) referrals.

---

## 10. Team Bonus Tier System

The team bonus is a second layer of reward that recognizes users who help grow the platform's total staked value.

### 10.1 How Team Bonus Works

Each user's **team total staked** = sum of WFBIT staked by all users in their downline (all 10 levels). As this number grows, the user unlocks progressively higher bonus tiers. The bonus BPS is applied on top of every reward claim.

### 10.2 Tier Table

| Tier | Label      | Min Team Staked     | Bonus APY |
|------|------------|---------------------|-----------|
| 1    | Bronze     | 250,000 WFBIT       | +2%       |
| 2    | Silver     | 350,000 WFBIT       | +3%       |
| 3    | Gold       | 500,000 WFBIT       | +4%       |
| 4    | Platinum   | 1,000,000 WFBIT     | +5%       |
| 5    | Diamond    | 5,000,000 WFBIT     | +6%       |
| 6    | Ruby       | 10,000,000 WFBIT    | +7%       |
| 7    | Emerald    | 50,000,000 WFBIT    | +7.5%     |
| 8    | Sapphire   | 100,000,000 WFBIT   | +8.5%     |
| 9    | Obsidian   | 500,000,000 WFBIT   | +9%       |
| 10   | Titan      | 1,000,000,000 WFBIT | +10%      |

Tiers are calculated and applied **on-chain** at claim time via `getTeamBonusBps(user)`. The on-chain tier config is adjustable and always takes precedence over any frontend constant.

### 10.3 Maximum Effective Yield

A top-tier **Titan** user staking at maximum APY could earn:
- Base APY: 250%
- Team Bonus: +10%
- **Total Effective APY: up to ~260%**

Plus passive referral income from 10 levels of downline activity.

---

## 11. Security Architecture

### 11.1 Smart Contract Security

The `FBiTStaking.sol` contract inherits from:
- `OpenZeppelin Ownable` — access control for admin functions
- `OpenZeppelin Pausable` — emergency pause/unpause
- `OpenZeppelin ReentrancyGuard` — prevents re-entrancy attacks

**Four audit fixes applied before mainnet launch:**

| # | Fix                                                                              |
|---|----------------------------------------------------------------------------------|
| 1 | `getReferralPercentages()` added as `pure` getter (avoids constant array storage issue) |
| 2 | `_calculateReward` uses locked APY from stake entry (`entry.apy > 0 ? entry.apy : getEffectiveAPY()`) |
| 3 | `ReferralSkipped` event added for pool-insufficient referral payments             |
| 4 | `_processReferralRewards` refactored with memory array + graceful skip logic      |

### 11.2 Ownership Renouncement

The contract includes a `renounceOwnershipWithFee()` function. When called:
- Ownership is permanently renounced (no admin functions can be called after)
- A one-time fee is transferred to the former admin wallet
- `OwnershipRenounced` event is emitted on-chain
- The platform becomes fully autonomous and immutable

Post-renouncement, the `isRenounced` flag is `true` and the `feeRecipient` address + `totalFeesCollected` are publicly readable.

### 11.3 Frontend Security

The web application includes multiple layers of protection:
- **Bot Protection** — ML-based bot classifier (`mlBotClassifier.ts`) that analyzes behavioral patterns
- **CAPTCHA Challenge** — Risk-triggered challenge UI (`BotChallenge`) for suspicious sessions
- **Rate Limiting** — Per-action rate limits enforced client-side (`checkRateLimit`)
- **Input Sanitization** — All user inputs sanitized before contract calls
- **User Blocking** — Admin can block/unblock individual addresses on-chain

### 11.4 Emergency Controls

| Function              | Effect                                                  |
|-----------------------|---------------------------------------------------------|
| `pause()`             | Halts all staking operations; existing stakes unaffected |
| `unpause()`           | Resumes normal operation                                |
| `emergencyWithdraw()` | Recovers accidentally sent tokens (admin only)          |

---

## 12. Smart Contract Addresses

### 12.1 Polygon Mainnet (Chain ID 137)

| Contract              | Address                                              |
|-----------------------|------------------------------------------------------|
| FBiTStaking (Active)  | `0xb86DA67406DaD482428704c14AdA269E9653FDca`         |
| WFBIT Token           | `0xa31b5A95268CAd709e6691Ec2F2F107A3F36D945`         |
| Explorer              | [Polygonscan](https://polygonscan.com)               |

Both contracts are **verified on Polygonscan and Sourcify**.

### 12.2 Solana Mainnet

| Asset             | Address                                                  |
|-------------------|----------------------------------------------------------|
| FBiT SPL Mint     | `CuubBzUTnQ4H2D2fHJCVWGEUEod2fJzq4nAPwfx8UGTu`         |
| Program ID        | Deployment in progress (Anchor program compiled)         |

---

## 13. Tokenomics

### 13.1 Total Supply

| Token | Total Supply         | Network |
|-------|----------------------|---------|
| WFBIT | 1,000,000,000 (1B)   | Polygon |
| FBiT  | TBD                  | Solana  |

### 13.2 WFBIT Allocation (Polygon)

| Allocation           | Amount (WFBIT)  | % of Supply |
|----------------------|-----------------|-------------|
| Staking Reserve Vault | 800,000,000    | 80%         |
| Circulating / Users   | 200,000,000    | 20%         |

The **800M WFBIT reserve** is locked in the on-chain reserve vault and released at a rate of **1,000,000 WFBIT per year** (adjustable by admin, capped by contract logic). This provides approximately **800 years** of staking reward runway, ensuring no liquidity crunch for current stakers.

### 13.3 Emission Schedule

```
Year 1  (2026): 1,000,000 WFBIT emitted → reward pool
Year 2  (2027): 1,000,000 WFBIT emitted → reward pool
...
Year 800 (2826): Reserve fully depleted
```

At any point, `getRemainingYears()` on the contract shows the remaining emission runway.

### 13.4 Deflationary Pressure

Every claim, compound, and unstake burns a portion of rewards. Over time:
- `totalBurned` grows, reducing circulating supply
- `totalYearlyBurned` tracks annual burn from year-end pool burns
- Net effect: circulating supply decreases even as emission continues

---

## 14. Roadmap

### Phase 1 — Polygon Launch (COMPLETE ✓)
- [x] WFBIT ERC-20 token deployed and verified
- [x] FBiTStaking contract deployed and verified
- [x] 800M WFBIT reserve funded (May 2, 2026)
- [x] Staking platform fully operational
- [x] 10-level referral system live
- [x] 10-tier team bonus system live
- [x] Frontend deployed on Vercel

### Phase 2 — Solana Launch (IN PROGRESS)
- [x] Anchor program compiled (fbit_staking.so, 433KB)
- [x] FBiT SPL mint created on Solana mainnet
- [ ] Fund program deployment wallet (~3.5 SOL required)
- [ ] Deploy Anchor program to mainnet
- [ ] Initialize platform account + fund reserve vault
- [ ] Connect Solana program to frontend

### Phase 3 — Growth & Ecosystem
- [ ] Centralized Exchange (CEX) listing for WFBIT/FBiT
- [ ] Cross-chain bridge: WFBIT ↔ FBiT (Polygon ↔ Solana)
- [ ] Mobile application
- [ ] DAO governance for parameter updates
- [ ] Additional chain deployments

---

## 15. Conclusion

FBiT Staking Platform represents a new generation of DeFi staking — one that combines **long-term financial sustainability** (800-year emission reserve), **community-driven growth mechanics** (10-level referrals + 10-tier team bonuses), and **deflationary tokenomics** (burn on every transaction) into a single, audited, multi-chain protocol.

The platform is live and fully operational on Polygon Mainnet, with Solana deployment imminent. Its transparent on-chain architecture — verifiable contracts, public emission tracking, and ownership renouncement capability — ensures that FBiT Staking can operate autonomously and trustlessly for generations.

---

## Technical Reference

### Key Contract Constants

| Parameter              | Value                        |
|------------------------|------------------------------|
| `LOCK_PERIOD`          | 30 days                      |
| `CLAIM_INTERVAL`       | 21,600 seconds (6 hours)     |
| `MIN_APY_BPS`          | 6,000 (60%)                  |
| `MAX_APY_BPS`          | 25,000 (250%)                |
| `ANNUAL_EMISSION`      | 1,000,000 WFBIT              |
| `MIN_STAKE_AMOUNT`     | Read from contract           |
| `MAX_STAKE_PER_USER`   | Read from contract           |
| `BURN_BPS`             | Read from contract           |
| Token Decimals         | 6                            |

### Key Contract Functions (Public)

| Function                        | Description                                    |
|---------------------------------|------------------------------------------------|
| `registerUser(referrer)`        | Register a new user, optionally with referrer  |
| `stake(amount)`                 | Stake WFBIT tokens for 30 days                 |
| `claimRewards(stakeId)`         | Claim accrued rewards for a stake entry        |
| `compoundRewards(stakeId)`      | Add rewards back to principal                  |
| `unstake(stakeId)`              | Withdraw staked tokens after lock expires      |
| `getEffectiveAPY()`             | Current dynamic APY in basis points            |
| `getPendingReward(user, id)`    | Pending reward for a specific stake            |
| `getUserStakes(user)`           | All stake entries for an address               |
| `getReferralChain(user)`        | 10-level referral chain                        |
| `getReferralPercentages()`      | 10 referral commission percentages             |
| `getTeamBonusBps(user)`         | Current team bonus for a user (BPS)            |
| `getReleasableEmission()`       | Tokens ready to release from reserve           |
| `getRemainingYears()`           | Remaining emission runway in years             |
| `releaseEmission()`             | Release releasable tokens into reward pool     |

---

*This whitepaper is provided for informational purposes. FBiT Staking is a decentralized protocol — users interact with smart contracts directly and are responsible for their own due diligence.*

*Polygon Staking Contract: `0xb86DA67406DaD482428704c14AdA269E9653FDca` · Verified on Polygonscan*
