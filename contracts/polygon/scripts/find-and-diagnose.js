/**
 * Pure ethers.js script (no hardhat) — uses Ankr RPC to find stakers and diagnose claims.
 * Run: node scripts/find-and-diagnose.js
 */
const { ethers } = require("ethers");

const STAKING = "0xb86DA67406DaD482428704c14AdA269E9653FDca";
const RPC     = "https://polygon-mainnet.public.blastapi.io";

const ABI = [
  "function CLAIM_INTERVAL() external view returns (uint256)",
  "function rewardPoolBalance() external view returns (uint256)",
  "function paused() external view returns (bool)",
  "function totalUsers() external view returns (uint256)",
  "function totalStaked() external view returns (uint256)",
  "function users(address) external view returns (uint256 totalStaked, uint256 totalRewardsEarned, uint256 totalReferralRewards, address referrer, uint256 referralCount, bool isBlocked, bool isRegistered, uint256 registeredAt, uint256 stakeCount, uint256 teamSize, uint256 teamTotalStaked)",
  `function getUserStakes(address user) external view returns (
    tuple(uint256 amount, uint8 lockPeriodIndex, uint256 stakedAt, uint256 unlockAt,
          uint256 lastClaimAt, uint256 totalClaimed, bool isActive, uint256 apy)[]
  )`,
  "function getPendingReward(address user, uint256 stakeId) external view returns (uint256)",
  "event UserRegistered(address indexed user, address indexed referrer, uint256 timestamp)",
  "event TokensStaked(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 fee, uint256 lockPeriod, uint256 unlockAt, uint256 apy)",
];

async function diagnoseUser(contract, addr, claimInterval) {
  const fmt  = (v) => ethers.formatUnits(v, 6);
  const now  = Math.floor(Date.now() / 1000);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`USER: ${addr}`);
  const user = await contract.users(addr);
  console.log(`  isRegistered: ${user.isRegistered}  isBlocked: ${user.isBlocked}  stakeCount: ${user.stakeCount}`);
  console.log(`  totalStaked:  ${fmt(user.totalStaked)} WFBIT`);

  const stakes = await contract.getUserStakes(addr);
  console.log(`  getUserStakes array length: ${stakes.length}`);

  for (const [i, s] of stakes.entries()) {
    const elapsed  = now - Number(s.lastClaimAt);
    const canClaim = elapsed >= Number(claimInterval);
    const waitH    = ((Number(claimInterval) - elapsed) / 3600).toFixed(2);

    console.log(`\n  Stake [array index ${i}]:`);
    console.log(`    amount:    ${fmt(s.amount)} WFBIT  isActive: ${s.isActive}`);
    console.log(`    apy:       ${(Number(s.apy) / 100).toFixed(2)}%`);
    console.log(`    lastClaim: ${new Date(Number(s.lastClaimAt) * 1000).toISOString()}`);
    console.log(`    canClaim:  ${canClaim ? "✓ YES" : `✗ NO (${waitH}h left)`}`);

    // Probe stakeId 0, 1, and 2 to detect off-by-one
    console.log(`    --- getPendingReward probes ---`);
    for (const testId of [0, 1, 2]) {
      try {
        const p = await contract.getPendingReward(addr, BigInt(testId));
        const mark = p > 0n ? " ← ✓ HAS REWARDS" : "";
        console.log(`    getPendingReward(${testId}) = ${fmt(p)} WFBIT${mark}`);
      } catch (e) {
        console.log(`    getPendingReward(${testId}) = REVERT "${e.reason || e.shortMessage || e.message?.slice(0,60)}"`);
      }
    }
  }

  if (stakes.length === 0 && Number(user.stakeCount) > 0) {
    console.log(`  ⚠ stakeCount=${user.stakeCount} but getUserStakes=[] — probing directly:`);
    for (const testId of [0, 1, 2]) {
      try {
        const p = await contract.getPendingReward(addr, BigInt(testId));
        console.log(`  getPendingReward(${testId}) = ${fmt(p)} WFBIT${p > 0n ? " ← HAS REWARDS" : ""}`);
      } catch (e) {
        console.log(`  getPendingReward(${testId}) = REVERT "${e.reason || e.shortMessage || e.message?.slice(0,60)}"`);
      }
    }
  }
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const contract = new ethers.Contract(STAKING, ABI, provider);

  const fmt = (v) => ethers.formatUnits(v, 6);

  const [claimInterval, rewardPool, paused, totalUsers, totalStaked] = await Promise.all([
    contract.CLAIM_INTERVAL(),
    contract.rewardPoolBalance(),
    contract.paused(),
    contract.totalUsers(),
    contract.totalStaked(),
  ]);

  console.log("=== Contract State ===");
  console.log(`CLAIM_INTERVAL:    ${claimInterval}s = ${(Number(claimInterval)/3600).toFixed(1)}h`);
  console.log(`rewardPoolBalance: ${fmt(rewardPool)} WFBIT`);
  console.log(`paused:            ${paused}`);
  console.log(`totalUsers:        ${totalUsers}`);
  console.log(`totalStaked:       ${fmt(totalStaked)} WFBIT`);

  // Find registered users via events (last 5000 blocks in chunks of 2000)
  const latest = await provider.getBlockNumber();
  const CHUNK  = 2000;
  const FROM   = latest - 10000;

  console.log(`\nSearching UserRegistered events (blocks ${FROM}–${latest})...`);

  const topic = ethers.id("UserRegistered(address,address,uint256)");
  const stakers = new Set();

  for (let start = FROM; start < latest; start += CHUNK) {
    const end = Math.min(start + CHUNK - 1, latest);
    try {
      const logs = await provider.getLogs({
        address: STAKING,
        topics:  [topic],
        fromBlock: start,
        toBlock: end,
      });
      for (const log of logs) {
        const decoded = contract.interface.parseLog(log);
        stakers.add(decoded.args.user);
      }
    } catch(e) {
      console.warn(`  chunk ${start}-${end}: ${e.message?.slice(0,60)}`);
    }
  }

  // Also check TokensStaked events
  const stakeTopic = ethers.id("TokensStaked(address,uint256,uint256,uint256,uint256,uint256,uint256)");
  for (let start = FROM; start < latest; start += CHUNK) {
    const end = Math.min(start + CHUNK - 1, latest);
    try {
      const logs = await provider.getLogs({
        address: STAKING,
        topics:  [stakeTopic],
        fromBlock: start,
        toBlock: end,
      });
      for (const log of logs) {
        const decoded = contract.interface.parseLog(log);
        stakers.add(decoded.args.user);
        console.log(`  TokensStaked: user=${decoded.args.user}  stakeId=${decoded.args.stakeId}  amount=${fmt(decoded.args.amount)}`);
      }
    } catch(e) {
      console.warn(`  chunk ${start}-${end}: ${e.message?.slice(0,60)}`);
    }
  }

  if (stakers.size === 0) {
    console.log("No stakers found in recent blocks. The contract may have been deployed earlier.");
    console.log("\nProvide your wallet address: USER_ADDR=0x... node scripts/find-and-diagnose.js");

    const userAddr = process.env.USER_ADDR;
    if (userAddr) {
      await diagnoseUser(contract, userAddr, claimInterval);
    }
    return;
  }

  console.log(`\nFound ${stakers.size} staker(s):`);
  for (const addr of stakers) {
    await diagnoseUser(contract, addr, claimInterval);
  }
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
