/**
 * Tests the resolveStakeId pre-flight logic directly on Polygon mainnet.
 * Simulates what the frontend does when Claim is clicked.
 *
 * Run: USER_ADDR=0xYOUR_WALLET node scripts/test-preflight.js
 */
const { ethers } = require("ethers");

const STAKING  = "0xb86DA67406DaD482428704c14AdA269E9653FDca";
const RPC      = "https://polygon-bor-rpc.publicnode.com";
const USER     = process.env.USER_ADDR || "";

const ABI = [
  "function claimRewards(uint256 stakeId) external",
  "function compoundRewards(uint256 stakeId) external",
  `function getUserStakes(address user) external view returns (
    tuple(uint256 amount, uint8 lockPeriodIndex, uint256 stakedAt, uint256 unlockAt,
          uint256 lastClaimAt, uint256 totalClaimed, bool isActive, uint256 apy)[]
  )`,
  "function getPendingReward(address user, uint256 stakeId) external view returns (uint256)",
  "function CLAIM_INTERVAL() external view returns (uint256)",
];

async function resolveStakeId(iface, provider, fnName, userAddr, sid) {
  const candidates = [sid, sid + 1n];
  let lastReason = "";

  for (const candidateId of candidates) {
    const calldata = iface.encodeFunctionData(fnName, [candidateId]);
    try {
      await provider.call({ to: STAKING, from: userAddr, data: calldata });
      console.log(`  ✓ ${fnName}(${candidateId}) staticCall PASSED → using stakeId=${candidateId}`);
      return candidateId;
    } catch (err) {
      if (err?.code !== "CALL_EXCEPTION") {
        console.log(`  ⚠ Network/RPC error for ${fnName}(${candidateId}): ${err.code} — fallback to original`);
        return sid;
      }
      const reason = err?.reason ?? err?.shortMessage ?? err?.message ?? "";
      lastReason = reason;
      const notFound = /invalid stake|stake not found|no stake|nonexistent|does not exist|out of bounds/i.test(reason);
      console.log(`  ✗ ${fnName}(${candidateId}) REVERT: "${reason}" notFound=${notFound}`);
      if (notFound) continue;
      if (reason) {
        console.log(`  → Contract rejected with reason: "${reason}" (business logic — stakeId is valid)`);
        throw new Error(reason);
      }
    }
  }

  throw new Error(lastReason || "Both stakeId candidates rejected by contract");
}

async function main() {
  if (!USER.startsWith("0x")) {
    console.error("Set USER_ADDR=0xYOUR_WALLET before running");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC);
  const iface = new ethers.Interface(ABI);
  const fmt = (v) => ethers.formatUnits(v, 6);
  const now = Math.floor(Date.now() / 1000);

  const claimInterval = await provider.call({
    to: STAKING,
    data: iface.encodeFunctionData("CLAIM_INTERVAL"),
  });
  const interval = Number(new ethers.Interface(["function CLAIM_INTERVAL() view returns (uint256)"]).decodeFunctionResult("CLAIM_INTERVAL", claimInterval)[0]);
  console.log(`CLAIM_INTERVAL: ${interval}s = ${(interval/3600).toFixed(1)}h`);

  // Get stakes
  const rawStakes = await provider.call({
    to: STAKING,
    data: iface.encodeFunctionData("getUserStakes", [USER]),
  });
  const stakes = iface.decodeFunctionResult("getUserStakes", rawStakes)[0];
  console.log(`\ngetUserStakes: ${stakes.length} stake(s) for ${USER}\n`);

  for (const [i, s] of stakes.entries()) {
    const lastClaim = Number(s.lastClaimAt);
    const elapsed = now - lastClaim;
    const canClaim = elapsed >= interval;
    console.log(`Stake [array index ${i}]:`);
    console.log(`  amount:    ${fmt(s.amount)} WFBIT  isActive: ${s.isActive}`);
    console.log(`  lastClaim: ${new Date(lastClaim * 1000).toISOString()}`);
    console.log(`  elapsed:   ${(elapsed/3600).toFixed(2)}h  canClaim: ${canClaim}`);

    // Check pending rewards for stakeId 0 and 1
    for (const testId of [0n, 1n]) {
      const pd = await provider.call({
        to: STAKING,
        data: iface.encodeFunctionData("getPendingReward", [USER, testId]),
      });
      const amount = iface.decodeFunctionResult("getPendingReward", pd)[0];
      console.log(`  getPendingReward(${testId}) = ${fmt(amount)} WFBIT${amount > 0n ? " ← HAS REWARDS" : ""}`);
    }

    if (s.isActive) {
      console.log(`\n  Pre-flight test (claimRewards):`);
      try {
        const resolvedId = await resolveStakeId(iface, provider, "claimRewards", USER, BigInt(i));
        console.log(`  → Would call claimRewards(${resolvedId})`);
      } catch (e) {
        console.log(`  → Pre-flight threw: "${e.message}"`);
      }
    }
    console.log();
  }
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
