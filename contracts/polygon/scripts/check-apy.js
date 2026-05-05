const { ethers } = require("hardhat");

const STAKING = "0xb86DA67406DaD482428704c14AdA269E9653FDca";

async function main() {
  const staking = await ethers.getContractAt("FBiTStaking", STAKING);

  const [
    effectiveAPY, minAPY, maxAPY,
    totalStaked, annualEmission,
    rewardPool, totalReserve,
  ] = await Promise.all([
    staking.getEffectiveAPY(),
    staking.MIN_APY_BPS(),
    staking.MAX_APY_BPS(),
    staking.totalStaked(),
    staking.ANNUAL_EMISSION(),
    staking.rewardPoolBalance(),
    staking.totalReserve(),
  ]);

  const fmt  = (v) => ethers.formatUnits(v, 6);
  const bps  = (v) => `${(Number(v) / 100).toFixed(2)}%  (${Number(v)} BPS)`;

  console.log("=== APY State ===");
  console.log("getEffectiveAPY(): ", bps(effectiveAPY));
  console.log("MIN_APY_BPS:       ", bps(minAPY));
  console.log("MAX_APY_BPS:       ", bps(maxAPY));
  console.log("");
  console.log("=== Why this APY? (PoS formula) ===");
  console.log("ANNUAL_EMISSION:   ", fmt(annualEmission), "WFBIT");
  console.log("totalStaked:       ", fmt(totalStaked), "WFBIT");

  const emission = Number(annualEmission);
  const staked   = Number(totalStaked);
  if (staked > 0) {
    const rawAPY = Math.round((emission / staked) * 10000);
    console.log("Raw APY formula:    emission/staked * 10000 =", rawAPY, "BPS =", rawAPY/100, "%");
    console.log("Clamped to range:  ", Math.min(Number(maxAPY), Math.max(Number(minAPY), rawAPY)), "BPS");
  } else {
    console.log("totalStaked = 0 → APY defaults to MAX_APY_BPS");
  }

  console.log("");
  console.log("rewardPoolBalance: ", fmt(rewardPool), "WFBIT");
  console.log("totalReserve:      ", fmt(totalReserve), "WFBIT");
}

main().catch(e => { console.error(e); process.exit(1); });
