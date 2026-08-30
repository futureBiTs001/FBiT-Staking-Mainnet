# Future Bit (FBiT) Staking Platform — Whitepaper

> **Version 2.1 · August 2026**
> Solana Staking Protocol

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

**Future Bit (FBiT) Staking** is a decentralized staking protocol on **Solana**. The platform allows FBiT token holders to stake and earn a dynamic Annual Percentage Yield (APY), compoundable every 6 hours, ranging from **10% to 300%** based on real-time on-chain conditions.

Beyond simple staking, FBiT introduces a **10-level deep referral system** and a **10-tier team bonus structure** that rewards community builders with additional on-chain bonuses. The protocol funds rewards from a long-term **on-chain emission reserve**, giving reward sustainability without centralized re-funding.

Key highlights:

- Up to **300% APY** (dynamic, PoS-based, 10% floor)
- **30-day lock period** with 6-hour claim intervals
- **10-level referral rewards** totaling **17.75%** passive income
- **10-tier team bonus** (Bronze → Titan) up to +10% additional APY
- **229,830,026 FBiT reserve** funding a **12,000,000 FBiT/year** target emission (~19-year runway)
- **Deflationary burn** on every claim, compound, and unstake
- **250,000,000 fixed FBiT supply** — mint authority renounced on-chain
- Live on **Solana Mainnet** (Program ID `8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp`)

---

## 2. Introduction

The decentralized finance (DeFi) ecosystem has grown rapidly, but most staking protocols offer only flat, unsustainable APYs without any network-growth incentive built in. Future Bit Staking addresses these limitations with:

1. **Dynamic APY** — yield adjusts automatically based on on-chain conditions (10%–300%), ensuring long-term sustainability.
2. **Multi-level referral architecture** — 10 levels of passive referral income that incentivize organic growth without off-chain pyramids.
3. **Team-based tier bonuses** — users who build larger staking teams unlock bonus yields, aligning individual incentives with platform growth.
4. **Deflationary token supply** — a burn mechanism on every transaction reduces circulating supply over time.
5. **Transparent emission schedule** — a fixed annual emission target released from an on-chain reserve vault means no surprise minting or re-funding events.

The platform is built with the **Anchor framework** on Solana, using Program Derived Addresses (PDAs) for trustless, non-custodial vault management.

---

## 3. Token Overview

### 3.1 FBiT SPL Token (Solana)

| Property          | Value                                                |
| ------------------ | ----------------------------------------------------- |
| **Symbol**        | FBiT                                                 |
| **Decimals**      | 9                                                     |
| **Total Supply**  | 250,000,000 FBiT (fixed — mint authority renounced)   |
| **Network**       | Solana Mainnet                                       |
| **Mint Address**  | `5uJ8rkiqEs5uzERCqVw9a1eC6BkP54MZAF3D229dyoME`       |
| **Standard**      | SPL Token                                             |

FBiT is both the **stake token** and the **reward token**. This single-token design means all staking rewards are paid in the same asset users stake, eliminating impermanent loss from reward token divergence. The Solana program uses Program Derived Addresses (PDAs) for trustless vault management — staked and reward tokens are held in program-owned accounts, never by any individual wallet.

> **Note:** the staking program was upgraded in place to point at this token (same program ID, `8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp`) on 2026-08-20 — the migration is live on mainnet. See §12.

---

## 4. Platform Architecture

### 4.1 Solana Program

The Solana program is built with the **Anchor framework** using PDAs for all vaults:

- **Platform PDA** — global state (total staked, users, config)
- **User PDA** — per-user account (stakes, referrer, team info)
- **Stake Entry PDA** — individual stake records (seeds: `["stake", owner, timestamp]`)
- **Stake Vault** — token account holding staked tokens
- **Reward Vault** — token account holding reward tokens
- **Reserve Vault** — long-term emission reserve

It handles:

- User registration with optional referrer
- Multi-position staking (one user can hold multiple stake entries)
- Live, real-time APY calculation at every claim/compound
- 10-level referral reward distribution on each claim
- Team bonus calculation and application
- Annual emission release from the reserve vault

### 4.2 Frontend

The web application is built with **Next.js 16 (App Router)** and deployed on **Vercel**. Wallet connectivity is provided by **Reown AppKit** (formerly WalletConnect), using AppKit's built-in Wallet Standard auto-detection for Solana wallets (Phantom, Solflare, Backpack, and others).

---

## 5. Staking Mechanics

### 5.1 How to Stake

1. **Connect Wallet** — Connect Phantom, Solflare, or any Solana wallet.
2. **Register** — Register on-chain with an optional referrer address (one-time, free).
3. **Stake** — Call `stake(amount)` and sign the transaction. Unlike EVM chains, Solana requires no separate token-approval step — the transfer is authorized directly by your signature in the same transaction. The amount is locked for 30 days.

Each stake call creates a new **stake entry** with a unique ID. Users can hold multiple active stakes simultaneously.

### 5.2 Lock Period

| Parameter        | Value                                       |
| ----------------- | -------------------------------------------- |
| Lock Duration    | **30 Days**                                 |
| Early Unstake    | Not allowed (funds locked until `unlockAt`) |
| Unlock Condition | current time `>= unlockAt`                  |

The `unlockAt` timestamp is set at stake time: `stakedAt + 30 days`. Once unlocked, users may call `unstake(stakeId)` to withdraw their principal plus any unclaimed rewards.

### 5.3 Claim Interval

Rewards accrue per completed **6-hour interval** (4 intervals per day). Users may call `claimRewards(stakeId)` once every 6 hours.

| Parameter      | Value                                     |
| --------------- | ------------------------------------------ |
| Claim Interval | **6 hours** (21,600 seconds)              |
| Claims per Day | 4 (maximum)                               |
| Minimum Wait   | Must complete at least 1 full 6h interval |

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

FBiT uses a **Proof-of-Stake style dynamic APY** that fluctuates between a fixed floor and ceiling:

| Parameter   | Value                                        |
| ----------- | --------------------------------------------- |
| Minimum APY | **10%** (1,000 BPS)                          |
| Maximum APY | **300%** (30,000 BPS)                        |
| APY Unit    | Basis Points (BPS), where 10,000 BPS = 100%  |
| Formula     | `clamp(annual_emission × 10,000 / total_staked, 1,000, 30,000)` |

The effective APY (`getEffectiveAPY()`) is computed on-chain based on current platform conditions — as more tokens are staked platform-wide, APY moves down toward the 10% floor; as fewer tokens are staked, APY moves up toward the 300% ceiling. The stake-time APY is stored on each stake entry for display purposes only — `claim_rewards`/`compound_rewards` always recompute against the **current, live** platform-wide APY at the moment of the claim, so a staker's actual payout tracks total staked in real time rather than being fixed at the moment they staked.

### 6.2 Reward Calculation Formula

```text
reward per 6h interval = (stakedAmount × APY_BPS / 10,000) / 1,460

where 1,460 = 4 intervals/day × 365 days
```

**Example:** 10,000 FBiT staked at 250% APY:

- Annual reward = 10,000 × 2.50 = 25,000 FBiT
- Per 6h interval = 25,000 / 1,460 ≈ 17.12 FBiT

### 6.3 Team Bonus on Rewards

When claiming or compounding, the contract also calculates a **team bonus** based on the user's current team tier. This bonus is added on top of the base staking reward (see Section 10 for tier details).

---

## 7. Emission & Reserve System

FBiT's long-term sustainability is funded by an **on-chain reserve vault** that releases tokens into the reward pool at a fixed annual rate.

### 7.1 Reserve Vault

| Parameter               | Value                                          |
| ------------------------ | ------------------------------------------------ |
| Reserve Allocation      | **229,830,026 FBiT** (91.9% of total supply)    |
| Annual Emission Target  | **12,000,000 FBiT / year**                      |
| Nominal Runway          | **~19 years**                                   |

The reserve is held in a separate vault from the active reward pool. This design ensures:

- The reward pool cannot be accidentally over-spent
- Emission is transparent and verifiable on-chain at all times
- No trusted party can re-mint or inflate tokens (mint authority is renounced — see §3.1)

### 7.2 Emission Release

Anyone can call `releaseEmission()` to move releasable tokens from the reserve into the active reward pool. The releasable amount is proportional to time elapsed since the last release:

```text
releasable = (now - lastReleaseTime) × ANNUAL_EMISSION / 365 days
```

The program enforces that releases cannot exceed the total reserve balance. `getReleasableEmission()` is a public view function providing full transparency. The admin can adjust the annual emission rate at any time via `setAnnualEmission()`.

### 7.3 Reward Pool

The active reward pool (`rewardPoolBalance`) is what pays out staking rewards, referral commissions, and team bonuses. It receives tokens from:

1. The emission release mechanism (primary, automated)
2. Direct funding by the platform (`fundRewardPool`) for bootstrap liquidity

---

## 8. Burn Mechanism

FBiT incorporates a **deflationary burn** that permanently removes tokens from circulation on every staking event.

### 8.1 Transaction Burn

A **BURN_BPS** fee (configurable, capped by `MAX_BURN_BPS`, default 10%) is deducted from the reward/principal on:

| Action            | Burn Applied To                    |
| ------------------ | ------------------------------------ |
| `claimRewards`    | Reward amount                      |
| `compoundRewards` | Reward amount (before compounding) |
| `unstake`         | Reward amount at unstake            |

The burn amount is permanently removed from circulating supply via an on-chain burn instruction and tracked in the `totalBurned` counter.

---

## 9. Referral Program (10-Level)

FBiT's referral system is one of its most distinctive features. When a user registers with a referrer address, a 10-level referral chain is established on-chain.

### 9.1 How Referrals Work

1. User A stakes tokens.
2. On each `claimRewards` or `compoundRewards`, the program traverses User A's 10-level referral chain.
3. Each ancestor in the chain receives a percentage of User A's reward as a **referral bonus**, paid from the reward pool.
4. If the reward pool has insufficient balance for a referral payment, the payment is skipped gracefully (no failure).

### 9.2 Referral Commission Table

| Level     | Percentage |
| ---------- | ---------- |
| 1         | **0.25%**  |
| 2         | **0.50%**  |
| 3         | **1.25%**  |
| 4         | **1.50%**  |
| 5         | **1.75%**  |
| 6         | **2.00%**  |
| 7         | **2.25%**  |
| 8         | **2.50%**  |
| 9         | **2.75%**  |
| 10        | **3.00%**  |
| **Total** | **17.75%** |

The contract's built-in default (`DEFAULT_REFERRAL_PERCENTAGES`) is a steeper curve totaling 30% — the table above reflects the live on-chain values currently set via `set_referral_percentages`, which is what stakers actually earn today.

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

Each user's **team total staked** = sum of tokens staked by all users in their downline (all 10 levels). As this number grows, the user unlocks progressively higher bonus tiers. The bonus BPS is applied on top of every reward claim.

### 10.2 Tier Table (FBiT, 250M fixed supply)

Bronze starts at 50,000 FBiT; Titan tops out at 100,000,000 FBiT (40% of total supply) — very ambitious, reachable over time as reward emission and secondary-market circulation grow.

| Tier | Label    | Min Team Staked   | Bonus APY |
| ---- | -------- | ------------------ | --------- |
| 1    | Bronze   | 50,000 FBiT        | +2%       |
| 2    | Silver   | 100,000 FBiT       | +3%       |
| 3    | Gold     | 250,000 FBiT       | +4%       |
| 4    | Platinum | 500,000 FBiT       | +5%       |
| 5    | Diamond  | 1,000,000 FBiT     | +6%       |
| 6    | Ruby     | 2,500,000 FBiT     | +7%       |
| 7    | Emerald  | 5,000,000 FBiT     | +7.5%     |
| 8    | Sapphire | 10,000,000 FBiT    | +8.5%     |
| 9    | Obsidian | 20,000,000 FBiT    | +9%       |
| 10   | Titan    | 100,000,000 FBiT   | +10%      |

Tiers are calculated and applied **on-chain** at claim time via `getTeamBonusBps(user)`. The on-chain tier config (`set_team_target_tier`) is admin-adjustable and always takes precedence over any frontend constant.

### 10.3 Maximum Effective Yield

A top-tier **Titan** user staking at maximum APY could earn:

- Base APY: 300%
- Team Bonus: +10%
- **Total Effective APY: up to ~310%**

Plus passive referral income from 10 levels of downline activity.

---

## 11. Security Architecture

### 11.1 Smart Contract Security

The Solana program is written in Rust using the **Anchor framework**, which provides:

- Strict account validation on every instruction (owner checks, PDA seed verification, signer checks)
- Checked arithmetic throughout reward, emission, and burn calculations to prevent overflow/underflow
- `onlyAuthority`-style access control on all admin instructions, enforced by the runtime, not just application logic
- Program Derived Addresses (PDAs) for every vault — no private key exists that can unilaterally move staked or reward funds outside program logic

### 11.2 Ownership Renouncement

The program includes a `renounce_ownership` instruction. When called:

- Ownership is permanently renounced (no admin instructions can be called after)
- A **25% passive fee** (of gross reward) is paid to the former admin wallet from the reward pool on every future claim/compound, in exchange for giving up all control
- The 1% platform fee on stake/claim/unstake is waived once renounced
- An on-chain event is emitted
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

| Function    | Effect                                                    |
| ------------ | ----------------------------------------------------------- |
| `pause()`   | Halts all staking operations; existing stakes unaffected  |
| `unpause()` | Resumes normal operation                                  |

### 11.5 Liquidity Lock & Token Vesting

Beyond program-level protections, FBiT's tokenomics (§13.2) are structured to remove common rug-pull vectors entirely:

| Safeguard                    | Detail                                                                 |
| ------------------------------ | -------------------------------------------------------------------------- |
| **Liquidity Lock**            | 100% of the 20,169,974 FBiT (8.1%) liquidity allocation is **locked or burned** — no wallet, including the team's, can withdraw pool liquidity. |
| **Fixed Supply**              | Mint authority is renounced on the FBiT SPL mint — the 250,000,000 total supply can never be increased. |

These safeguards are verifiable directly on-chain (mint authority, liquidity pool ownership, and vesting contract addresses) and are independent of any statement in this document.

---

## 12. Smart Contract Addresses

### 12.1 Solana Mainnet

| Asset         | Address                                        |
| -------------- | ------------------------------------------------ |
| FBiT SPL Mint | `5uJ8rkiqEs5uzERCqVw9a1eC6BkP54MZAF3D229dyoME` |
| Program ID    | `8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp` |

The same program ID was retained across the token migration — the program was upgraded in place rather than redeployed (see §3.1 note). The migration to the mint above, the annual emission rate, the Team Target Bonus tiers, and the 120,000,000 FBiT reserve deposit are all live on mainnet as of 2026-08-20.

---

## 13. Tokenomics

### 13.1 Total Supply

| Token | Total Supply         | Network |
| ----- | ---------------------- | ------- |
| FBiT  | 250,000,000 (fixed)   | Solana  |

### 13.2 FBiT Allocation

The 250,000,000 FBiT supply is fixed — the mint authority has been renounced on-chain, so no additional FBiT can ever be created.

| Allocation      | Amount (FBiT) | % of Supply |
| --------------- | ------------- | ----------- |
| Staking Reserve | 229,830,026   | 91.9%       |
| Liquidity       | 20,169,974    | 8.1%        |

- **Staking Reserve (91.9%, 229,830,026 FBiT)** funds the auto-emission system described in §7 — topped up from its original 120,000,000 with an additional 110,000,000 FBiT deposit to extend the nominal runway (see §13.3).
- **Liquidity (8.1%)** is deployed into the FBiT/SOL pool and **100% locked or burned** — it can never be pulled by a single wallet.

### 13.3 Emission Schedule

FBiT's dynamic APY (§6.1) is driven by an annual emission rate released from the 229,830,026 FBiT staking reserve — targeted at **12,000,000 FBiT/year**, an approximately **19-year nominal runway**:

```text
Year 1  (2026): 12,000,000 FBiT emitted → reward pool
Year 2  (2027): 12,000,000 FBiT emitted → reward pool
...
Year 19 (2045): Reserve nominal runway complete
```

### 13.4 Deflationary Pressure

Every claim, compound, and unstake burns a portion of rewards. Over time:

- `totalBurned` grows, reducing circulating supply
- Net effect: circulating supply decreases even as emission continues

---

## 14. Roadmap

The phases below describe goals the team is building toward — they are not commitments to any specific exchange, partner, or date. Phase 1 items are already shipped and independently verifiable on-chain; later phases are forward-looking.

### Phase 1 — Foundation (COMPLETE ✓)

- [x] FBiT SPL token + Anchor staking program (`fbit_staking.so`) live on Solana mainnet (`8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp`)
- [x] Staking fully operational — 10-level referral system, 10-tier Team Target Bonus, auto-emission reserve, deflationary burn
- [x] Non-custodial, open-source contract
- [x] Frontend deployed (Next.js on Vercel), AI-powered support chat, full SEO setup

### Phase 2 — Consolidation & Security (CURRENT)

- [x] FBiT token v2 — fixed 250,000,000 supply, mint authority renounced
- [x] 100% of liquidity locked/burned
- [ ] Independent third-party smart contract audit
- [x] Whitepaper and public documentation brought current

### Phase 3 — Market Expansion

- [ ] Additional DEX liquidity depth on Solana
- [ ] Community and marketing growth campaigns
- [ ] DeFi ecosystem partnerships and integrations
- [ ] Continued platform hardening based on audit findings

### Phase 4 — Exchange Listings & Governance

- [ ] Tier-2 / Tier-3 centralized exchange (CEX) listing outreach
- [ ] Tier-1 CEX listing readiness — compliance review, market-making arrangements, sufficient liquidity depth
- [ ] DAO governance for protocol parameter updates

### Phase 5 — Long-Term Vision

- [ ] Additional chain deployments
- [ ] Expanded FBiT token utility beyond staking
- [ ] Ongoing audits and security reviews

---

## 15. Conclusion

FBiT Staking Platform represents a new generation of DeFi staking — one that combines **long-term financial sustainability** (on-chain emission reserve), **community-driven growth mechanics** (10-level referrals + 10-tier team bonuses), and **deflationary tokenomics** (burn on every transaction) into a single, non-custodial protocol.

The platform is live and fully operational on Solana Mainnet. Its transparent on-chain architecture — a verifiable program, public emission tracking, locked/burned liquidity, and ownership renouncement capability — ensures that FBiT Staking can operate autonomously and trustlessly for the long term.

---

## Technical Reference

### Key Contract Constants

| Parameter            | Value                                                   |
| --------------------- | --------------------------------------------------------- |
| `LOCK_PERIOD`        | 30 days                                                 |
| `CLAIM_INTERVAL`     | 21,600 seconds (6 hours)                                |
| `MIN_APY_BPS`        | 1,000 (10%)                                             |
| `MAX_APY_BPS`        | 30,000 (300%)                                           |
| `ANNUAL_EMISSION`    | 12,000,000 FBiT (target, admin-settable)                |
| `MIN_STAKE_AMOUNT`   | 0.1 FBiT                                                |
| `MAX_STAKE_PER_USER` | 250,000,000 FBiT (per `stake()` call — see note below)  |
| `BURN_BPS`           | Admin-settable, 0–5,000 (0%–50%), default 1,000 (10%)   |
| Token Decimals       | 9                                                        |

> **Note:** `MAX_STAKE_PER_USER` is enforced per individual `stake()` call, not against the user's cumulative total staked. A user can exceed the intended per-user ceiling by splitting a large position across multiple `stake()` calls. This is a known limitation in the currently deployed program — see [SECURITY.md](SECURITY.md) for details.

### Key Contract Functions (Public)

| Function                     | Description                                   |
| ------------------------------ | ------------------------------------------------ |
| `register_user(referrer)`    | Register a new user, optionally with referrer |
| `stake(amount)`              | Stake FBiT tokens for 30 days                 |
| `claim_rewards(stake_id)`    | Claim accrued rewards for a stake entry       |
| `compound_rewards(stake_id)` | Add rewards back to principal                 |
| `unstake(stake_id)`          | Withdraw staked tokens after lock expires     |
| `get_effective_apy()`        | Current dynamic APY in basis points           |
| `get_user_stakes(user)`      | All stake entries for an address              |
| `get_referral_chain(user)`   | 10-level referral chain                       |
| `get_team_bonus_bps(user)`   | Current team bonus for a user (BPS)           |
| `get_releasable_emission()`  | Tokens ready to release from reserve          |
| `release_emission()`         | Release releasable tokens into reward pool    |

---

*This whitepaper is provided for informational purposes. FBiT Staking is a decentralized protocol — users interact with smart contracts directly and are responsible for their own due diligence.*
