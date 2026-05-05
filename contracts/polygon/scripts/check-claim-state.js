const { ethers } = require("hardhat");

const STAKING = "0xb86DA67406DaD482428704c14AdA269E9653FDca";

async function main() {
  const staking = await ethers.getContractAt("FBiTStaking", STAKING);

  const [
    claimInterval,
    totalStaked,
    totalUsers,
    rewardPool,
    paused,
    effectiveAPY,
  ] = await Promise.all([
    staking.CLAIM_INTERVAL(),
    staking.totalStaked(),
    staking.totalUsers(),
    staking.rewardPoolBalance(),
    staking.paused(),
    staking.getEffectiveAPY(),
  ]);

  const fmt = (v) => ethers.formatUnits(v, 6);
  const bps = (v) => `${(Number(v) / 100).toFixed(2)}%`;

  console.log("=== Contract Claim State ===");
  console.log("CLAIM_INTERVAL:    ", Number(claimInterval), "seconds =", (Number(claimInterval) / 3600).toFixed(1), "hours");
  console.log("totalStaked:       ", fmt(totalStaked), "WFBIT");
  console.log("totalUsers:        ", Number(totalUsers));
  console.log("rewardPoolBalance: ", fmt(rewardPool), "WFBIT");
  console.log("paused:            ", Boolean(paused));
  console.log("effectiveAPY:      ", bps(effectiveAPY));

  // Check if any wallet address was passed as arg
  const addr = process.argv[2];
  if (addr && addr.startsWith("0x")) {
    console.log("\n=== User Stakes for", addr, "===");
    const stakes = await staking.getUserStakes(addr);
    const now = Math.floor(Date.now() / 1000);

    if (stakes.length === 0) {
      console.log("No stakes found.");
    } else {
      for (const [i, s] of stakes.entries()) {
        const lastClaim = Number(s.lastClaimAt);
        const elapsed   = now - lastClaim;
        const canClaim  = elapsed >= Number(claimInterval);
        const waitSecs  = Math.max(0, Number(claimInterval) - elapsed);
        const waitHrs   = (waitSecs / 3600).toFixed(1);

        console.log(`\nStake #${i}:`);
        console.log(`  amount:      ${fmt(s.amount)} WFBIT`);
        console.log(`  isActive:    ${s.isActive}`);
        console.log(`  apy:         ${bps(s.apy)}`);
        console.log(`  stakedAt:    ${new Date(Number(s.stakedAt) * 1000).toISOString()}`);
        console.log(`  unlockAt:    ${new Date(Number(s.unlockAt) * 1000).toISOString()}`);
        console.log(`  lastClaimAt: ${new Date(lastClaim * 1000).toISOString()}`);
        console.log(`  elapsed:     ${(elapsed / 3600).toFixed(2)}h since last claim`);
        console.log(`  canClaim:    ${canClaim}${canClaim ? ' ✓ READY' : ` ✗ wait ${waitHrs}h more`}`);

        if (s.isActive) {
          try {
            const pending = await staking.getPendingReward(addr, BigInt(i));
            console.log(`  pending:     ${fmt(pending)} WFBIT`);
          } catch (e) {
            console.log(`  pending:     ERROR — ${e.message}`);
          }
        }
      }
    }
  } else {
    console.log("\nTip: pass your wallet address to check stake state:");
    console.log("  npx hardhat run scripts/check-claim-state.js --network polygon_mainnet 0xYOUR_ADDRESS");
  }
}

main().catch(e => { console.error(e); process.exit(1); });
