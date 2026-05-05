/**
 * Reads TokensStaked events to find the actual stakeId stored in the contract.
 * This tells us if we have an off-by-one bug (0-based vs 1-based stakeId).
 */
const { ethers } = require("ethers");

const STAKING = "0xb86DA67406DaD482428704c14AdA269E9653FDca";

// Try multiple RPCs
const RPCS = [
  "https://polygon-bor-rpc.publicnode.com",
  "https://1rpc.io/matic",
];

const ABI = [
  `function getUserStakes(address user) external view returns (
    tuple(uint256 amount, uint8 lockPeriodIndex, uint256 stakedAt, uint256 unlockAt,
          uint256 lastClaimAt, uint256 totalClaimed, bool isActive, uint256 apy)[]
  )`,
  "function getPendingReward(address user, uint256 stakeId) external view returns (uint256)",
  "function users(address) external view returns (uint256 totalStaked, uint256 totalRewardsEarned, uint256 totalReferralRewards, address referrer, uint256 referralCount, bool isBlocked, bool isRegistered, uint256 registeredAt, uint256 stakeCount, uint256 teamSize, uint256 teamTotalStaked)",
  "event TokensStaked(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 fee, uint256 lockPeriod, uint256 unlockAt, uint256 apy)",
  "event RewardsClaimed(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 fee, uint256 timestamp)",
];

async function tryGetLogs(provider, filter) {
  const latest = await provider.getBlockNumber();
  // Contract was deployed around block 68,000,000 (late 2024). Search backwards in chunks.
  const CHUNK = 2000;
  const FROM  = latest - 20000; // last ~20k blocks
  let logs = [];
  for (let start = FROM; start < latest; start += CHUNK) {
    const end = Math.min(start + CHUNK - 1, latest);
    try {
      const chunk = await provider.getLogs({ ...filter, fromBlock: start, toBlock: end });
      logs = logs.concat(chunk);
    } catch(e) {
      // skip
    }
  }
  return logs;
}

async function main() {
  let provider;
  for (const rpc of RPCS) {
    try {
      const p = new ethers.JsonRpcProvider(rpc);
      await p.getBlockNumber();
      provider = p;
      console.log("Connected to RPC:", rpc, "\n");
      break;
    } catch(e) {
      console.log("RPC failed:", rpc);
    }
  }
  if (!provider) { console.error("No RPC worked!"); return; }

  const contract = new ethers.Contract(STAKING, ABI, provider);
  const iface    = new ethers.Interface(ABI);
  const fmt = (v) => ethers.formatUnits(v, 6);

  // Get TokensStaked event topic
  const stakedTopic   = ethers.id("TokensStaked(address,uint256,uint256,uint256,uint256,uint256,uint256)");
  const claimedTopic  = ethers.id("RewardsClaimed(address,uint256,uint256,uint256,uint256)");

  console.log("=== Searching for TokensStaked events ===");
  const stakedLogs = await tryGetLogs(provider, { address: STAKING, topics: [stakedTopic] });

  if (stakedLogs.length === 0) {
    console.log("No TokensStaked events in last 20k blocks.");
    console.log("Contract might have been deployed earlier. Trying a wider search...");

    // Try from an earlier block
    const latest = await provider.getBlockNumber();
    const CHUNK = 2000;
    let found = [];
    for (let start = Math.max(0, latest - 100000); start < latest && found.length === 0; start += CHUNK) {
      const end = Math.min(start + CHUNK - 1, latest);
      try {
        const chunk = await provider.getLogs({ address: STAKING, topics: [stakedTopic], fromBlock: start, toBlock: end });
        found = found.concat(chunk);
      } catch {}
    }
    stakedLogs.push(...found);
  }

  const stakers = new Set();
  for (const log of stakedLogs) {
    const decoded = iface.parseLog(log);
    const user = decoded.args.user;
    const stakeId = decoded.args.stakeId;
    stakers.add(user);
    console.log(`TokensStaked: user=${user}  stakeId=${stakeId}  amount=${fmt(decoded.args.amount)}`);
    console.log(`  ← Frontend will call claimRewards(array_index=?) for this stake`);
  }

  console.log("\n=== Searching for RewardsClaimed events ===");
  const claimedLogs = await tryGetLogs(provider, { address: STAKING, topics: [claimedTopic] });
  for (const log of claimedLogs) {
    const decoded = iface.parseLog(log);
    console.log(`RewardsClaimed: user=${decoded.args.user}  stakeId=${decoded.args.stakeId}  amount=${fmt(decoded.args.amount)}`);
  }

  if (stakers.size === 0) {
    console.log("\nNo stakers found in recent blocks.");
    const userAddr = process.env.USER_ADDR;
    if (userAddr) {
      console.log("\n=== Checking", userAddr, "directly ===");
      await checkUser(contract, provider, userAddr, iface, fmt);
    }
    return;
  }

  for (const addr of stakers) {
    await checkUser(contract, provider, addr, iface, fmt);
  }
}

async function checkUser(contract, provider, addr, iface, fmt) {
  console.log(`\n=== User: ${addr} ===`);
  const user = await contract.users(addr);
  console.log(`stakeCount: ${user.stakeCount}  isRegistered: ${user.isRegistered}`);

  const stakes = await contract.getUserStakes(addr);
  console.log(`getUserStakes array length: ${stakes.length}`);

  // The critical check: does array index match what claimRewards expects?
  for (const [i, s] of stakes.entries()) {
    console.log(`\n  Array[${i}]: amount=${fmt(s.amount)} WFBIT  isActive=${s.isActive}  apy=${Number(s.apy)/100}%`);

    // Probe stakeId 0 and 1 to detect offset
    for (const testId of [0n, 1n, BigInt(i)]) {
      try {
        const p = await contract.getPendingReward(addr, testId);
        const mark = p > 0n ? " ← HAS REWARDS" : "";
        console.log(`    getPendingReward(${testId}) = ${fmt(p)} WFBIT${mark}`);
      } catch(e) {
        const reason = e.reason || e.shortMessage || e.message?.slice(0, 80);
        console.log(`    getPendingReward(${testId}) = REVERT: "${reason}"`);
      }
    }

    // Simulate claimRewards staticCall
    const stakingWithProvider = new ethers.Contract(
      contract.target,
      ["function claimRewards(uint256 stakeId) external"],
      provider
    );
    for (const testId of [0n, 1n]) {
      try {
        await provider.call({
          to: contract.target,
          data: iface.encodeFunctionData ?
            new ethers.Interface(["function claimRewards(uint256)"]).encodeFunctionData("claimRewards", [testId]) :
            "0x",
          from: addr,
        });
        console.log(`    claimRewards(${testId}) staticCall: ✓ WOULD SUCCEED`);
      } catch(e) {
        const reason = e.reason || e.shortMessage || e.message?.slice(0, 100);
        console.log(`    claimRewards(${testId}) staticCall: ✗ REVERT: "${reason}"`);
      }
    }
  }
}

main().catch(e => { console.error("Fatal:", e.message); });
