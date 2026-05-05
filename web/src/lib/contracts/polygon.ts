'use client';

/**
 * Polygon FBiTStaking contract service (ethers v6)
 *
 * All public methods throw on error — callers should catch.
 * Amount parameters are in token units (not wei).
 */

import { BrowserProvider, JsonRpcProvider, Contract, Interface, parseUnits, formatUnits } from 'ethers';
import { FBIT_STAKING_ABI, ERC20_ABI } from './abi';
import { NETWORK_CONFIG } from '@/lib/config';
import type { PlatformStats, StakeEntry, UserAccount, ReferralInfo, ReferralEntry } from '@/types';

const DECIMALS = 6;

function toWei(amount: number): bigint {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  return parseUnits(amount.toFixed(DECIMALS), DECIMALS);
}

function safeBigInt(value: number, name: string): bigint {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${name}: ${value}`);
  }
  return BigInt(Math.round(value));
}

function fromWei(raw: bigint): number {
  return parseFloat(formatUnits(raw, DECIMALS));
}

async function assertPolygonMainnet(): Promise<void> {
  const provider = await getProvider();
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  if (chainId === 137) return;

  // Wrong chain — try to switch automatically before throwing.
  try {
    await provider.send('wallet_switchEthereumChain', [{ chainId: '0x89' }]);
    return; // Switch accepted — proceed
  } catch (switchErr: any) {
    // Error 4902 / -32603: chain not added to wallet yet — add it first.
    if (switchErr?.code === 4902 || switchErr?.code === -32603) {
      try {
        await provider.send('wallet_addEthereumChain', [{
          chainId: '0x89',
          chainName: 'Polygon Mainnet',
          nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
          rpcUrls: ['https://polygon-rpc.com', 'https://polygon-bor-rpc.publicnode.com'],
          blockExplorerUrls: ['https://polygonscan.com'],
        }]);
        return; // Added and switched
      } catch {}
    }
    // User rejected the switch request or it failed — show a clear message.
    throw new Error(
      `Wrong network — please switch your wallet to Polygon Mainnet (chain 137). Currently on chain ${chainId}.`
    );
  }
}

/**
 * Returns an EIP-1193 BrowserProvider for the active wallet.
 *
 * Priority:
 *  1. Reown AppKit — the only wallet manager in this app. It correctly returns
 *     the provider for whichever wallet the user chose (WalletConnect mobile,
 *     MetaMask via AppKit UI, Coinbase, Trust, etc.).
 *  2. Raw injected provider (window.ethereum / window.BinanceChain) — fallback
 *     for direct MetaMask usage without going through AppKit.
 *
 * IMPORTANT: Reown must come first. If window.ethereum is checked first,
 * a browser-installed MetaMask extension will shadow the Reown/WalletConnect
 * provider even when the user explicitly connected a different wallet via AppKit.
 */
async function getProvider(): Promise<BrowserProvider> {
  // 1. Reown AppKit provider (WalletConnect mobile, MetaMask-via-AppKit, etc.)
  try {
    const { appKitModal } = await import('@/lib/reown');
    if (appKitModal) {
      const walletProvider = (appKitModal as any).getWalletProvider?.();
      if (walletProvider) return new BrowserProvider(walletProvider as any);
    }
  } catch {}

  // 2. Raw injected provider (direct MetaMask / Binance Wallet without AppKit)
  const w = (window as any);
  const injected = w.ethereum ?? w.BinanceChain;
  if (injected) return new BrowserProvider(injected);

  throw new Error('No EVM wallet found. Please connect your wallet to continue.');
}

// Reliable Polygon RPC endpoints tried in order
const POLYGON_RPC_FALLBACKS = [
  NETWORK_CONFIG.polygon.rpcUrl,
  'https://polygon-bor-rpc.publicnode.com',
  'https://1rpc.io/matic',
  'https://polygon-rpc.com',
].filter(Boolean);

/**
 * Read-only RPC provider — no wallet needed, used for view calls.
 */
function getReadOnlyProvider(): JsonRpcProvider {
  return new JsonRpcProvider(
    NETWORK_CONFIG.polygon.rpcUrl || 'https://polygon-bor-rpc.publicnode.com'
  );
}

/**
 * Fetch FBiT ERC-20 balance for a Polygon wallet.
 * Tries each RPC in POLYGON_RPC_FALLBACKS until one succeeds.
 */
export async function polygonGetTokenBalance(address: string): Promise<number> {
  if (!address || !address.startsWith('0x')) return 0;
  const { stakeTokenAddress } = NETWORK_CONFIG.polygon;
  if (!stakeTokenAddress || stakeTokenAddress.length < 10 || stakeTokenAddress.toUpperCase().startsWith('YOUR_')) return 0;
  for (const rpc of POLYGON_RPC_FALLBACKS) {
    try {
      const provider = new JsonRpcProvider(rpc);
      const token = new Contract(stakeTokenAddress, ERC20_ABI, provider);
      const raw: bigint = await token.balanceOf(address);
      return fromWei(raw);
    } catch {
      // Try next RPC
    }
  }
  return 0;
}

/** Read-only staking contract (no signer). */
function getReadOnlyStakingContract(): Contract {
  return new Contract(NETWORK_CONFIG.polygon.contractAddress, FBIT_STAKING_ABI, getReadOnlyProvider());
}

/** Read-only ERC-20 token contract. */
function getReadOnlyTokenContract(tokenAddress: string): Contract {
  return new Contract(tokenAddress, ERC20_ABI, getReadOnlyProvider());
}

async function getStakingContract(withSigner = true): Promise<Contract> {
  const { contractAddress } = NETWORK_CONFIG.polygon;
  const provider = await getProvider();
  const signerOrProvider = withSigner ? await provider.getSigner() : provider;
  return new Contract(contractAddress, FBIT_STAKING_ABI, signerOrProvider);
}

async function getTokenContract(tokenAddress: string, withSigner = true): Promise<Contract> {
  const provider = await getProvider();
  const signerOrProvider = withSigner ? await provider.getSigner() : provider;
  return new Contract(tokenAddress, ERC20_ABI, signerOrProvider);
}

async function ensureApproval(tokenAddress: string, spender: string, amount: bigint): Promise<void> {
  const provider = await getProvider();
  const signer = await provider.getSigner();
  const owner = await signer.getAddress();
  const token = await getTokenContract(tokenAddress);
  const allowance: bigint = await token.allowance(owner, spender);
  if (allowance < amount) {
    // Some tokens (e.g. USDT) require resetting allowance to 0 before re-approving.
    // Attempt reset first if there's an existing non-zero allowance.
    if (allowance > 0n) {
      try {
        const resetTx = await token.approve(spender, 0n);
        await resetTx.wait();
      } catch {
        // Token may not require reset — continue
      }
    }
    const tx = await token.approve(spender, amount);
    await tx.wait();
  }
}

// Safe hash extraction: tx.wait() returns null on timeout; tx always has .hash.
function txHash(tx: { hash: string }, receipt: { hash?: string } | null): string {
  return receipt?.hash ?? tx.hash;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function polygonFetchPlatformStats(): Promise<PlatformStats | null> {
  if (!NETWORK_CONFIG.polygon.contractAddress ||
      NETWORK_CONFIG.polygon.contractAddress.toUpperCase().startsWith('YOUR_')) return null;
  try {
    const contract = getReadOnlyStakingContract();

    // Use allSettled so a single missing/reverting getter doesn't wipe all stats.
    const results = await Promise.allSettled([
      contract.totalStaked(),           // 0
      contract.totalUsers(),            // 1
      contract.rewardPoolBalance(),     // 2
      contract.rewardRate(),            // 3
      contract.referralRewardRate(),    // 4
      contract.paused(),                // 5
      contract.totalBurned(),           // 6
      contract.ANNUAL_EMISSION(),       // 7
      contract.BURN_BPS(),              // 8
      contract.getEffectiveAPY(),       // 9
      contract.isRenounced(),           // 10
      contract.feeRecipient(),          // 11
      contract.totalFeesCollected(),    // 12
      contract.totalReserve(),          // 13
      contract.emissionStartTime(),     // 14
      contract.totalEmissionReleased(), // 15
      contract.getReleasableEmission(), // 16
      contract.getRemainingYears(),     // 17
      contract.getMaxPendingRewards(),  // 18
      contract.MIN_STAKE_AMOUNT(),      // 19
      contract.MAX_STAKE_PER_USER(),    // 20
      contract.LOCK_PERIOD(),           // 21 — returns 30 (days)
      contract.CLAIM_INTERVAL(),        // 22 — returns 43200 (seconds = 12h)
      contract.totalYearlyBurned(),     // 23
      contract.lastYearBurnTime(),      // 24
    ]);

    // Helper: extract value or return a fallback bigint/boolean/string
    const bigVal  = (i: number, fb: bigint  = 0n)    => results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<any>).value as bigint  : fb;
    const boolVal = (i: number, fb: boolean = false)  => results[i].status === 'fulfilled' ? Boolean((results[i] as PromiseFulfilledResult<any>).value)     : fb;
    const strVal  = (i: number, fb: string  = '')     => results[i].status === 'fulfilled' ? String((results[i]  as PromiseFulfilledResult<any>).value)     : fb;

    // At minimum totalStaked must succeed — if the core call fails the RPC is down
    if (results[0].status === 'rejected') return null;

    return {
      totalStaked:          fromWei(bigVal(0)),
      totalUsers:           Number(bigVal(1)),
      rewardPoolBalance:    fromWei(bigVal(2)),
      rewardRate:           Number(bigVal(3)),
      referralRewardRate:   Number(bigVal(4)),
      isPaused:             boolVal(5),
      totalBurned:          fromWei(bigVal(6)),
      annualEmission:       fromWei(bigVal(7)),
      burnBps:              Number(bigVal(8, 1000n)),
      effectiveAPY:         Math.min(25_000, Math.max(6_000, Number(bigVal(9, 6000n)))),
      isRenounced:          boolVal(10),
      feeRecipient:         strVal(11),
      totalFeesCollected:   fromWei(bigVal(12)),
      totalReserve:         fromWei(bigVal(13)),
      emissionStartTime:    Number(bigVal(14)),
      totalEmissionReleased:fromWei(bigVal(15)),
      releasableEmission:   fromWei(bigVal(16)),
      remainingYears:       Number(bigVal(17)),
      maxPendingRewards:    fromWei(bigVal(18)),
      minStakeAmount:       fromWei(bigVal(19)),
      maxStakePerUser:      fromWei(bigVal(20)),
      lockPeriodDays:       Number(bigVal(21, 30n)),
      claimIntervalSeconds: Number(bigVal(22, 43200n)),
      totalYearlyBurned:    fromWei(bigVal(23)),
      lastYearBurnTime:     Number(bigVal(24)),
    };
  } catch {
    return null;
  }
}

export async function polygonFetchUserTeamInfo(
  address: string
): Promise<{ tierIndex: number; bonusBps: number; teamTotalStaked: number; teamSize: number } | null> {
  try {
    const contract = getReadOnlyStakingContract();
    const [tierInfo, userInfo] = await Promise.all([
      contract.getTeamTierInfo(address),
      contract.users(address),
    ]);
    return {
      tierIndex:       Number(tierInfo.tierIndex),
      bonusBps:        Number(tierInfo.bonusBps),
      teamTotalStaked: fromWei(tierInfo.teamTotalStaked),
      teamSize:        Number(userInfo.teamSize),
    };
  } catch {
    return null;
  }
}

export async function polygonIsRegistered(address: string): Promise<boolean> {
  try {
    const contract = getReadOnlyStakingContract();
    const user = await contract.users(address);
    return Boolean(user.isRegistered);
  } catch {
    return false;
  }
}

export async function polygonRegisterUser(referrer?: string): Promise<{ txHash: string }> {
  await assertPolygonMainnet();
  const { contractAddress } = NETWORK_CONFIG.polygon;
  const provider = await getProvider();
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  // Guard: empty string causes ethers v6 "invalid BigNumberish" when encoding address type.
  const safeReferrer =
    referrer && referrer.trim().length > 0
      ? referrer
      : '0x0000000000000000000000000000000000000000';
  const iface = new Interface(FBIT_STAKING_ABI);
  const calldata = iface.encodeFunctionData('registerUser', [safeReferrer]);
  const gasLimit = await estimateGasForCall(contractAddress, address, calldata, 200_000n);
  const contract = await getStakingContract();
  const tx = await contract.registerUser(safeReferrer, { gasLimit });
  const receipt = await tx.wait();
  return { txHash: txHash(tx, receipt) };
}

export async function polygonStake(
  amount: number,
  referrer?: string
): Promise<{ txHash: string }> {
  await assertPolygonMainnet();
  const { contractAddress, stakeTokenAddress } = NETWORK_CONFIG.polygon;
  const provider = await getProvider();
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  const registered = await polygonIsRegistered(address);
  if (!registered) {
    await polygonRegisterUser(referrer);
  }

  const wei = toWei(amount);
  await ensureApproval(stakeTokenAddress, contractAddress, wei);

  const iface = new Interface(FBIT_STAKING_ABI);
  const calldata = iface.encodeFunctionData('stake', [wei]);
  const gasLimit = await estimateGasForCall(contractAddress, address, calldata, 300_000n);

  const contract = await getStakingContract();
  const tx = await contract.stake(wei, { gasLimit });
  const receipt = await tx.wait();
  return { txHash: txHash(tx, receipt) };
}

export async function polygonGetEffectiveAPY(): Promise<number> {
  try {
    const contract = getReadOnlyStakingContract();
    const raw: bigint = await contract.getEffectiveAPY();
    return Math.min(25_000, Math.max(6_000, Number(raw))); // BPS: 6000=60%, 25000=250%
  } catch {
    return 6000; // fallback 60% (MIN_APY_BPS)
  }
}

function safeStakeId(id: number | string): bigint {
  const n = typeof id === 'number' ? id : parseInt(String(id), 10);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    throw new Error(`Invalid stake ID: "${id}"`);
  }
  return BigInt(n);
}

/**
 * Pre-flight helper using the READ-ONLY provider (not the wallet).
 *
 * Problems this solves:
 * 1. Ethers v6 throws "invalid BigNumberish string: empty string" when a wallet's
 *    gas-estimation request returns an empty revert buffer — we catch it here first.
 * 2. Contracts may use 1-based stakeIds while our frontend maps 0-based array indices —
 *    we auto-detect by trying sid then sid+1.
 *
 * Returns the correct on-chain stakeId, or throws with the human-readable revert reason.
 */
async function resolveStakeId(
  fnName: 'claimRewards' | 'compoundRewards' | 'unstake',
  userAddr: string,
  sid: bigint,
): Promise<bigint> {
  const { contractAddress } = NETWORK_CONFIG.polygon;
  const iface = new Interface(FBIT_STAKING_ABI);
  let lastCallExceptionReason = '';

  for (const candidateId of [sid, sid + 1n]) {
    const calldata = iface.encodeFunctionData(fnName, [candidateId]);

    // Try every fallback RPC until we get a definitive answer (pass or CALL_EXCEPTION).
    // A plain network/RPC error is not definitive — try the next endpoint.
    let simResult: { passed: boolean; reason: string } | null = null;
    for (const rpcUrl of POLYGON_RPC_FALLBACKS) {
      try {
        await new JsonRpcProvider(rpcUrl).call({
          to: contractAddress, from: userAddr, data: calldata,
        });
        simResult = { passed: true, reason: '' };
        break;
      } catch (err: any) {
        if (err?.code === 'CALL_EXCEPTION') {
          const reason: string = err?.reason ?? err?.shortMessage ?? err?.message ?? '';
          simResult = { passed: false, reason };
          break; // Contract revert is definitive — no need to try other RPCs
        }
        // Network / RPC error — try next fallback
      }
    }

    if (!simResult) {
      // Every RPC failed with a network error — surface a clear message
      throw new Error('Network error — please check your connection and try again.');
    }

    if (simResult.passed) return candidateId;

    const { reason } = simResult;

    // "Stake not active / not found" → stakeId is wrong, try the next candidate
    const notFound =
      /invalid stake|stake not found|no stake|nonexistent|does not exist|out of bounds|invalid index|not active|stake.*inactive/i.test(reason);
    if (notFound) {
      lastCallExceptionReason = reason;
      continue;
    }

    // Any other business-logic revert (cooldown, paused, blocked, zero reward, etc.)
    // means THIS stakeId is correct — the contract rejected the operation itself.
    if (reason) throw new Error(reason);

    lastCallExceptionReason = reason;
  }

  // Both stakeId candidates reverted — surface the most useful message
  const isStakeInactive = /not active|inactive/i.test(lastCallExceptionReason);
  throw new Error(
    isStakeInactive
      ? 'Your stake is no longer active. Please refresh the page.'
      : lastCallExceptionReason ||
        'Claim was rejected by the contract. Please refresh the page and try again.'
  );
}

/**
 * Generic gas estimator using our own fallback RPCs.
 * Providing an explicit gasLimit prevents the wallet from calling
 * eth_estimateGas internally, which can throw "invalid BigNumberish"
 * when the wallet's node returns an empty revert buffer.
 */
async function estimateGasForCall(
  to: string,
  from: string,
  data: string,
  fallback: bigint,
): Promise<bigint> {
  for (const rpcUrl of POLYGON_RPC_FALLBACKS) {
    try {
      const estimated = await new JsonRpcProvider(rpcUrl).estimateGas({ to, from, data });
      return estimated * 130n / 100n; // +30% safety buffer
    } catch {
      // Try next RPC
    }
  }
  return fallback;
}

/** Estimate gas for claim/compound/unstake (each takes a single uint256 stakeId). */
async function estimateGasLimit(
  fnName: 'claimRewards' | 'compoundRewards' | 'unstake',
  userAddr: string,
  sid: bigint,
  fallback = 400_000n,
): Promise<bigint> {
  const { contractAddress } = NETWORK_CONFIG.polygon;
  const calldata = new Interface(FBIT_STAKING_ABI).encodeFunctionData(fnName, [sid]);
  return estimateGasForCall(contractAddress, userAddr, calldata, fallback);
}

/** Parse gross reward from a confirmed receipt using the named event. */
function rewardFromReceipt(
  receipt: { logs: readonly { topics: readonly string[]; data: string }[] } | null,
  eventName: 'RewardsClaimed' | 'RewardsCompounded',
): number {
  if (!receipt) return 0;
  const iface = new Interface(FBIT_STAKING_ABI);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
      if (parsed?.name === eventName) return fromWei(parsed.args.amount as bigint);
    } catch {}
  }
  return 0;
}

export async function polygonClaimRewards(
  stakeId: number | string
): Promise<{ txHash: string; reward: number }> {
  await assertPolygonMainnet();
  const sid = safeStakeId(stakeId);
  const provider = await getProvider();
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  // Pre-flight: confirms the call will succeed and resolves the correct stakeId
  const resolvedSid = await resolveStakeId('claimRewards', address, sid);

  // Provide explicit gasLimit so the wallet skips its own eth_estimateGas.
  const gasLimit = await estimateGasLimit('claimRewards', address, resolvedSid);

  const contract = await getStakingContract();
  const tx = await contract.claimRewards(resolvedSid, { gasLimit });
  const receipt = await tx.wait();

  // Read actual gross reward from the emitted event — more accurate than a
  // pre-flight getPendingReward which returns 0 when called between intervals.
  const reward = rewardFromReceipt(receipt, 'RewardsClaimed');
  return { txHash: txHash(tx, receipt), reward };
}

export async function polygonCompoundRewards(
  stakeId: number | string
): Promise<{ txHash: string; reward: number }> {
  await assertPolygonMainnet();
  const sid = safeStakeId(stakeId);
  const provider = await getProvider();
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  const resolvedSid = await resolveStakeId('compoundRewards', address, sid);
  const gasLimit = await estimateGasLimit('compoundRewards', address, resolvedSid);

  const contract = await getStakingContract();
  const tx = await contract.compoundRewards(resolvedSid, { gasLimit });
  const receipt = await tx.wait();

  // Read actual gross reward from the emitted event.
  const reward = rewardFromReceipt(receipt, 'RewardsCompounded');
  return { txHash: txHash(tx, receipt), reward };
}

export async function polygonUnstake(stakeId: number | string): Promise<{ txHash: string }> {
  await assertPolygonMainnet();
  const sid = safeStakeId(stakeId);
  const provider = await getProvider();
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  const resolvedSid = await resolveStakeId('unstake', address, sid);
  const gasLimit = await estimateGasLimit('unstake', address, resolvedSid);

  const contract = await getStakingContract();
  const tx = await contract.unstake(resolvedSid, { gasLimit });
  const receipt = await tx.wait();
  return { txHash: txHash(tx, receipt) };
}

export async function polygonGetUserStakes(address: string): Promise<StakeEntry[] | null> {
  try {
    const contract = getReadOnlyStakingContract();
    const raw = await contract.getUserStakes(address);
    const stakes: StakeEntry[] = (raw as any[]).map((s, i) => ({
      id: i,
      amount: fromWei(s.amount),
      lockPeriodIndex: Number(s.lockPeriodIndex),
      stakedAt: Number(s.stakedAt),
      unlockAt: Number(s.unlockAt),
      lastClaimAt: Number(s.lastClaimAt),
      totalClaimed: fromWei(s.totalClaimed),
      isActive: Boolean(s.isActive),
      apy: Number(s.apy),
    }));

    // Fetch exact pending rewards from contract for each active stake (parallel)
    const active = stakes.filter(s => s.isActive);
    if (active.length > 0) {
      const pendingResults = await Promise.allSettled(
        active.map(s => contract.getPendingReward(address, BigInt(s.id as number)))
      );
      active.forEach((s, i) => {
        const r = pendingResults[i];
        if (r.status === 'fulfilled') {
          stakes[s.id as number].pendingReward = fromWei(r.value as bigint);
        }
      });
    }

    return stakes;
  } catch {
    // Return null (not []) so callers can distinguish "RPC failed" from "no stakes"
    return null;
  }
}


export async function polygonGetUserAccount(address: string): Promise<UserAccount | null> {
  try {
    const contract = getReadOnlyStakingContract();
    const [user, teamBonusBps] = await Promise.all([
      contract.users(address),
      contract.getTeamBonusBps(address).catch(() => 0n),
    ]);
    return {
      address,
      totalStaked:          fromWei(user.totalStaked),
      totalRewardsEarned:   fromWei(user.totalRewardsEarned),
      totalReferralRewards: fromWei(user.totalReferralRewards),
      referrer:             user.referrer === '0x0000000000000000000000000000000000000000' ? null : user.referrer,
      referralCount:        Number(user.referralCount),
      teamSize:             Number(user.teamSize),
      teamTotalStaked:      fromWei(user.teamTotalStaked),
      isBlocked:            Boolean(user.isBlocked),
      registeredAt:         Number(user.registeredAt),
      currentTierBonusBps:  Number(teamBonusBps),
    };
  } catch {
    return null;
  }
}

// Commission rates in basis points per level (mirrors contract REFERRAL_PERCENTAGES)
const REFERRAL_LEVEL_BPS = [25, 50, 125, 150, 200, 325, 350, 425, 550, 800] as const;
const MAX_REFERRAL_DEPTH   = 10;
const MAX_REFERRAL_ENTRIES = 100; // cap total entries to avoid excessive RPC calls

export async function polygonGetReferralInfo(address: string): Promise<ReferralInfo | null> {
  try {
    const contract = getReadOnlyStakingContract();

    // Authoritative counts come from on-chain user struct.
    const user = await contract.users(address);
    const totalReferrals       = Number(user.referralCount);
    const totalReferralRewards = fromWei(user.totalReferralRewards);

    // BFS across up to MAX_REFERRAL_DEPTH levels.
    // parentAddresses = addresses whose direct referrals form the next level.
    let referrals: ReferralEntry[] = [];
    try {
      let parentAddresses: string[] = [address];

      for (let lvl = 1; lvl <= MAX_REFERRAL_DEPTH && referrals.length < MAX_REFERRAL_ENTRIES; lvl++) {
        // Collect all child addresses from every parent at this level
        const childAddresses: string[] = [];
        await Promise.allSettled(
          parentAddresses.map(async (addr) => {
            try {
              const addrs = await contract.getReferrals(addr);
              childAddresses.push(...(addrs as string[]));
            } catch {}
          })
        );

        if (childAddresses.length === 0) break;

        // Cap to remaining slots
        const slice    = childAddresses.slice(0, MAX_REFERRAL_ENTRIES - referrals.length);
        const levelBps = REFERRAL_LEVEL_BPS[lvl - 1];

        const userResults = await Promise.allSettled(
          slice.map((a: string) => contract.users(a))
        );

        slice.forEach((refAddr, i) => {
          const res = userResults[i];
          const ru  = res.status === 'fulfilled' ? res.value : null;
          const stakedAmount = ru ? fromWei(ru.totalStaked) : 0;
          referrals.push({
            address:      refAddr,
            level:        lvl,
            stakedAmount,
            rewardEarned: stakedAmount * levelBps / 10_000,
            registeredAt: ru ? Number(ru.registeredAt) : 0,
          });
        });

        if (referrals.length >= MAX_REFERRAL_ENTRIES) break;
        parentAddresses = childAddresses;
      }
    } catch {
      // Referral tree fetch failed — return count-only result with empty list.
    }

    return {
      totalReferrals,
      totalReferralRewards,
      referralLink: '',
      referrals,
      chain:        [],
    };
  } catch {
    return null;
  }
}

// ── Admin ──────────────────────────────────────────────────────────────────────

export async function polygonRenounceOwnership(): Promise<{ txHash: string }> {
  await assertPolygonMainnet();
  const contract = await getStakingContract();
  const tx = await contract.renounceOwnershipWithFee();
  const receipt = await tx.wait();
  return { txHash: txHash(tx, receipt) };
}

export async function polygonDepositReserve(amount: number): Promise<{ txHash: string }> {
  await assertPolygonMainnet();
  const { contractAddress, rewardTokenAddress } = NETWORK_CONFIG.polygon;
  const wei = toWei(amount);
  await ensureApproval(rewardTokenAddress, contractAddress, wei);
  const contract = await getStakingContract();
  const tx = await contract.depositReserve(wei);
  const receipt = await tx.wait();
  return { txHash: txHash(tx, receipt) };
}

export async function polygonReleaseEmission(): Promise<{ txHash: string }> {
  await assertPolygonMainnet();
  const contract = await getStakingContract();
  const tx = await contract.releaseEmission();
  const receipt = await tx.wait();
  return { txHash: txHash(tx, receipt) };
}

export async function polygonFundRewardPool(amount: number): Promise<{ txHash: string }> {
  await assertPolygonMainnet();
  const { contractAddress, rewardTokenAddress } = NETWORK_CONFIG.polygon;
  const wei = toWei(amount);
  await ensureApproval(rewardTokenAddress, contractAddress, wei);
  const contract = await getStakingContract();
  const tx = await contract.fundRewardPool(wei);
  const receipt = await tx.wait();
  return { txHash: txHash(tx, receipt) };
}

export async function polygonSetRewardRate(rate: number): Promise<{ txHash: string }> {
  await assertPolygonMainnet();
  const contract = await getStakingContract();
  const tx = await contract.setRewardRate(rate);
  const receipt = await tx.wait();
  return { txHash: txHash(tx, receipt) };
}

export async function polygonSetReferralRewardRate(rate: number): Promise<{ txHash: string }> {
  await assertPolygonMainnet();
  const contract = await getStakingContract();
  const tx = await contract.setReferralRewardRate(rate);
  const receipt = await tx.wait();
  return { txHash: txHash(tx, receipt) };
}

export async function polygonBlockUser(userAddress: string): Promise<{ txHash: string }> {
  await assertPolygonMainnet();
  const contract = await getStakingContract();
  const tx = await contract.blockUser(userAddress);
  const receipt = await tx.wait();
  return { txHash: txHash(tx, receipt) };
}

export async function polygonUnblockUser(userAddress: string): Promise<{ txHash: string }> {
  await assertPolygonMainnet();
  const contract = await getStakingContract();
  const tx = await contract.unblockUser(userAddress);
  const receipt = await tx.wait();
  return { txHash: txHash(tx, receipt) };
}

export async function polygonTogglePause(currentlyPaused: boolean): Promise<{ txHash: string }> {
  await assertPolygonMainnet();
  const contract = await getStakingContract();
  const tx = currentlyPaused ? await contract.unpause() : await contract.pause();
  const receipt = await tx.wait();
  return { txHash: txHash(tx, receipt) };
}

// ── On-chain history ───────────────────────────────────────────────────────────

/**
 * Fetch on-chain activity for a wallet from Polygon contract events.
 * Returns TxRecord[] sorted newest-first.
 */
export async function polygonGetOnChainHistory(address: string): Promise<import('@/types').TxRecord[]> {
  const { contractAddress } = NETWORK_CONFIG.polygon;
  if (!contractAddress || contractAddress.toUpperCase().startsWith('YOUR_')) return [];

  const contract = getReadOnlyStakingContract();
  const records: import('@/types').TxRecord[] = [];

  // Collect all events in parallel; each inner try isolates failures per type
  const blockCache = new Map<number, number>(); // blockNumber → timestamp(ms)

  async function getTs(ev: { blockNumber: number; getBlock: () => Promise<{ timestamp: number }> }): Promise<number> {
    if (blockCache.has(ev.blockNumber)) return blockCache.get(ev.blockNumber)!;
    try {
      const b = await ev.getBlock();
      const ts = b.timestamp * 1000;
      blockCache.set(ev.blockNumber, ts);
      return ts;
    } catch {
      return Date.now();
    }
  }

  const settled = await Promise.allSettled([
    // 1. TokensStaked
    (async () => {
      const evs = await contract.queryFilter(contract.filters.TokensStaked(address));
      for (const ev of evs) {
        const args = (ev as any).args;
        const ts = await getTs(ev as any);
        records.push({
          id: `poly-stake-${ev.transactionHash}`,
          type: 'stake',
          label: 'Staked WFBIT on Polygon',
          amount: fromWei(args.amount),
          txHash: ev.transactionHash,
          timestamp: ts,
          status: 'success',
          network: 'polygon',
        });
      }
    })(),

    // 2. RewardsClaimed
    (async () => {
      const evs = await contract.queryFilter(contract.filters.RewardsClaimed(address));
      for (const ev of evs) {
        const args = (ev as any).args;
        const ts = await getTs(ev as any);
        records.push({
          id: `poly-claim-${ev.transactionHash}`,
          type: 'claim',
          label: 'Claimed rewards on Polygon',
          amount: fromWei(args.amount),
          txHash: ev.transactionHash,
          timestamp: ts,
          status: 'success',
          network: 'polygon',
        });
      }
    })(),

    // 3. RewardsCompounded
    (async () => {
      const evs = await contract.queryFilter(contract.filters.RewardsCompounded(address));
      for (const ev of evs) {
        const args = (ev as any).args;
        const ts = await getTs(ev as any);
        records.push({
          id: `poly-compound-${ev.transactionHash}`,
          type: 'compound',
          label: 'Compounded rewards on Polygon',
          amount: fromWei(args.amount),
          txHash: ev.transactionHash,
          timestamp: ts,
          status: 'success',
          network: 'polygon',
        });
      }
    })(),

    // 4. TokensUnstaked
    (async () => {
      const evs = await contract.queryFilter(contract.filters.TokensUnstaked(address));
      for (const ev of evs) {
        const args = (ev as any).args;
        const ts = await getTs(ev as any);
        records.push({
          id: `poly-unstake-${ev.transactionHash}`,
          type: 'unstake',
          label: 'Unstaked WFBIT on Polygon',
          amount: fromWei(args.amount),
          txHash: ev.transactionHash,
          timestamp: ts,
          status: 'success',
          network: 'polygon',
        });
      }
    })(),

    // 5. ReferralReward (where this address is the referrer)
    (async () => {
      const evs = await contract.queryFilter(contract.filters.ReferralReward(null, address));
      for (const ev of evs) {
        const args = (ev as any).args;
        const ts = await getTs(ev as any);
        records.push({
          id: `poly-ref-${ev.transactionHash}-${args.level}`,
          type: 'referral',
          label: `Referral reward (Level ${args.level}) on Polygon`,
          amount: fromWei(args.amount),
          txHash: ev.transactionHash,
          timestamp: ts,
          status: 'success',
          network: 'polygon',
          referralLevel: Number(args.level),
        });
      }
    })(),

    // 6. TeamBonusApplied
    (async () => {
      const evs = await contract.queryFilter(contract.filters.TeamBonusApplied(address));
      for (const ev of evs) {
        const args = (ev as any).args;
        const ts = await getTs(ev as any);
        records.push({
          id: `poly-bonus-${ev.transactionHash}`,
          type: 'team_bonus',
          label: 'Team bonus reward on Polygon',
          amount: fromWei(args.bonusAmount),
          txHash: ev.transactionHash,
          timestamp: ts,
          status: 'success',
          network: 'polygon',
        });
      }
    })(),
  ]);

  // Log any failures silently (don't throw)
  settled.forEach(r => { if (r.status === 'rejected') console.warn('[polygonGetOnChainHistory]', r.reason); });

  return records.sort((a, b) => b.timestamp - a.timestamp);
}

export async function polygonSetBurnBps(burnBps: number): Promise<{ txHash: string }> {
  await assertPolygonMainnet();
  const contract = await getStakingContract();
  const tx = await contract.setBurnBps(safeBigInt(burnBps, 'burnBps'));
  const receipt = await tx.wait();
  return { txHash: txHash(tx, receipt) };
}

export async function polygonSetAnnualEmission(annualEmission: number): Promise<{ txHash: string }> {
  await assertPolygonMainnet();
  const contract = await getStakingContract();
  const tx = await contract.setAnnualEmission(toWei(annualEmission));
  const receipt = await tx.wait();
  return { txHash: txHash(tx, receipt) };
}

export async function polygonBurnUnusedPool(amount: number): Promise<{ txHash: string }> {
  await assertPolygonMainnet();
  const contract = await getStakingContract();
  const tx = await contract.burnUnusedPool(toWei(amount));
  const receipt = await tx.wait();
  return { txHash: txHash(tx, receipt) };
}

export async function polygonEmergencyWithdraw(
  tokenAddress: string,
  toAddress: string,
  amount: number
): Promise<{ txHash: string }> {
  await assertPolygonMainnet();
  const contract = await getStakingContract();
  const tx = await contract.emergencyWithdraw(tokenAddress, toAddress, toWei(amount));
  const receipt = await tx.wait();
  return { txHash: txHash(tx, receipt) };
}

export async function polygonSetTeamTargetTier(
  index: number,
  minTeamStaked: number,
  bonusBps: number
): Promise<{ txHash: string }> {
  await assertPolygonMainnet();
  if (!Number.isInteger(index) || index < 0 || index > 9) {
    throw new Error(`Invalid tier index: ${index}`);
  }
  const contract = await getStakingContract();
  const minStakedWei = toWei(minTeamStaked);
  const tx = await contract.setTeamTargetTier(index, minStakedWei, safeBigInt(bonusBps, 'bonusBps'));
  const receipt = await tx.wait();
  return { txHash: txHash(tx, receipt) };
}
