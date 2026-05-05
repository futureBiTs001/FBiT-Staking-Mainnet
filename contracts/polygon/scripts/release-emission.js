const { ethers } = require("hardhat");

const STAKING = "0xb86DA67406DaD482428704c14AdA269E9653FDca";

async function main() {
  const [deployer] = await ethers.getSigners();
  const staking = await ethers.getContractAt("FBiTStaking", STAKING, deployer);

  const releasable = await staking.getReleasableEmission();
  console.log("Releasable:", ethers.formatUnits(releasable, 6), "WFBIT");

  if (releasable === 0n) {
    console.log("Nothing to release yet.");
    return;
  }

  console.log("Calling releaseEmission()...");
  const tx = await staking.releaseEmission({
    maxFeePerGas:         ethers.parseUnits("200", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("50",  "gwei"),
    gasLimit: 200_000,
  });
  console.log("Tx:", tx.hash);
  await tx.wait();

  const pool = await staking.rewardPoolBalance();
  const released = await staking.totalEmissionReleased();
  console.log("\n✓ Done!");
  console.log("  rewardPoolBalance:     ", ethers.formatUnits(pool, 6), "WFBIT");
  console.log("  totalEmissionReleased: ", ethers.formatUnits(released, 6), "WFBIT");
}

main().catch(e => { console.error(e); process.exit(1); });
