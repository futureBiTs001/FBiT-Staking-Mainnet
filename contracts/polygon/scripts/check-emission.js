const { ethers } = require("hardhat");

const STAKING = "0xb86DA67406DaD482428704c14AdA269E9653FDca";

async function main() {
  const staking = await ethers.getContractAt("FBiTStaking", STAKING);

  const [
    rewardPool, totalReserve, emissionStart, totalReleased,
    releasable, annualEmission, remainingYears,
  ] = await Promise.all([
    staking.rewardPoolBalance(),
    staking.totalReserve(),
    staking.emissionStartTime(),
    staking.totalEmissionReleased(),
    staking.getReleasableEmission(),
    staking.ANNUAL_EMISSION(),
    staking.getRemainingYears(),
  ]);

  const fmt = (v) => ethers.formatUnits(v, 6);
  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - Number(emissionStart);

  console.log("=== Emission State ===");
  console.log("rewardPoolBalance:     ", fmt(rewardPool), "WFBIT");
  console.log("totalReserve:          ", fmt(totalReserve), "WFBIT");
  console.log("totalEmissionReleased: ", fmt(totalReleased), "WFBIT");
  console.log("getReleasableEmission: ", fmt(releasable), "WFBIT");
  console.log("ANNUAL_EMISSION:       ", fmt(annualEmission), "WFBIT/year");
  console.log("remainingYears:        ", Number(remainingYears));
  console.log("emissionStartTime:     ", new Date(Number(emissionStart) * 1000).toISOString());
  console.log("elapsed since start:   ", (elapsed / 3600).toFixed(2), "hours");
}

main().catch(e => { console.error(e); process.exit(1); });
