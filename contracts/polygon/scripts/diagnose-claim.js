/**
 * Diagnoses why claim/compound might not be working for a given wallet.
 * Run: npx hardhat run scripts/diagnose-claim.js --network polygon_mainnet
 */
const { ethers } = require("hardhat");

const STAKING = "0xb86DA67406DaD482428704c14AdA269E9653FDca";

// ── Put your wallet address here OR set env USER=0x...  ──────────────────────
const USER_ADDRESS = process.env.USER_ADDR || process.env.npm_config_user || "";

async function main() {
  if (!USER_ADDRESS.startsWith("0x")) {
    console.error("Usage: USER_ADDR=0xYOUR_WALLET npx hardhat run scripts/diagnose-claim.js --network polygon_mainnet");
    process.exit(1);
  }

  const staking = await ethers.getContractAt("FBiTStaking", STAKING);
  const fmt = (v) => ethers.formatUnits(v, 6);
  const bps = (v) => `${(Number(v) / 100).toFixed(2)}%`;
  const now = Math.floor(Date.now() / 1000);

  console.log("=== Contract State ===");
  const [claimInterval, rewardPool, paused] = await Promise.all([
    staking.CLAIM_INTERVAL(),
    staking.rewardPoolBalance(),
    staking.paused(),
  ]);
  console.log("CLAIM_INTERVAL:   ", Number(claimInterval), "sec =", (Number(claimInterval)/3600).toFixed(1), "h");
  console.log("rewardPoolBalance:", fmt(rewardPool), "WFBIT");
  console.log("paused:           ", Boolean(paused));

  console.log("\n=== User Registration ===");
  const user = await staking.users(USER_ADDRESS);
  console.log("isRegistered:", Boolean(user.isRegistered));
  console.log("isBlocked:   ", Boolean(user.isBlocked));
  console.log("stakeCount:  ", Number(user.stakeCount));
  console.log("totalStaked: ", fmt(user.totalStaked), "WFBIT");

  if (!user.isRegistered) {
    console.log("\n❌ User is NOT registered — cannot claim!");
    return;
  }
  if (user.isBlocked) {
    console.log("\n❌ User is BLOCKED — cannot claim!");
    return;
  }

  console.log("\n=== Stakes (getUserStakes array) ===");
  const stakes = await staking.getUserStakes(USER_ADDRESS);
  console.log("Total stakes in array:", stakes.length);

  for (const [i, s] of stakes.entries()) {
    const elapsed  = now - Number(s.lastClaimAt);
    const canClaim = elapsed >= Number(claimInterval);
    const waitSecs = Math.max(0, Number(claimInterval) - elapsed);

    console.log(`\n[Array index ${i}]`);
    console.log(`  amount:      ${fmt(s.amount)} WFBIT`);
    console.log(`  isActive:    ${s.isActive}`);
    console.log(`  apy:         ${bps(s.apy)}`);
    console.log(`  lastClaimAt: ${new Date(Number(s.lastClaimAt) * 1000).toISOString()}`);
    console.log(`  unlockAt:    ${new Date(Number(s.unlockAt) * 1000).toISOString()}`);
    console.log(`  elapsed:     ${(elapsed/3600).toFixed(2)}h since last claim`);
    console.log(`  canClaim:    ${canClaim ? '✓ YES' : `✗ NO — wait ${(waitSecs/3600).toFixed(2)}h`}`);

    // Test getPendingReward for index i AND i+1 to detect off-by-one
    console.log(`  --- Pending reward probes ---`);
    for (const testId of [i, i + 1]) {
      try {
        const p = await staking.getPendingReward(USER_ADDRESS, BigInt(testId));
        console.log(`  getPendingReward(${testId}): ${fmt(p)} WFBIT${p > 0n ? " ← HAS REWARDS" : ""}`);
      } catch (e) {
        console.log(`  getPendingReward(${testId}): REVERT — ${e.reason || e.message}`);
      }
    }

    // Simulate claimRewards (static call) to check if it would succeed
    if (s.isActive && canClaim) {
      try {
        await staking.claimRewards.staticCall(BigInt(i), { from: USER_ADDRESS });
        console.log(`  staticCall claimRewards(${i}): ✓ WOULD SUCCEED`);
      } catch (e) {
        console.log(`  staticCall claimRewards(${i}): ✗ WOULD REVERT — "${e.reason || e.shortMessage || e.message}"`);
        // Try with i+1 as well
        try {
          await staking.claimRewards.staticCall(BigInt(i + 1), { from: USER_ADDRESS });
          console.log(`  staticCall claimRewards(${i+1}): ✓ WOULD SUCCEED ← try stakeId=${i+1}!`);
        } catch (e2) {
          console.log(`  staticCall claimRewards(${i+1}): ✗ WOULD REVERT — "${e2.reason || e2.shortMessage || e2.message}"`);
        }
      }
    }
  }

  // Also probe stakeId=0 explicitly if stakeCount > 0 but no stakes in array
  if (stakes.length === 0 && Number(user.stakeCount) > 0) {
    console.log(`\n⚠ stakeCount=${user.stakeCount} but getUserStakes returned []`);
    console.log("Probing stakeId 0 and 1 directly...");
    for (const testId of [0, 1]) {
      try {
        const p = await staking.getPendingReward(USER_ADDRESS, BigInt(testId));
        console.log(`getPendingReward(${testId}): ${fmt(p)} WFBIT${p > 0n ? " ← HAS REWARDS" : ""}`);
      } catch (e) {
        console.log(`getPendingReward(${testId}): REVERT — ${e.reason || e.message}`);
      }
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
