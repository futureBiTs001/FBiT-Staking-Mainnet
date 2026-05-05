const { ethers } = require("hardhat");

const WFBIT   = "0xa31b5A95268CAd709e6691Ec2F2F107A3F36D945";
const STAKING = "0xb86DA67406DaD482428704c14AdA269E9653FDca";
const AMOUNT  = ethers.parseUnits("800000000", 6); // 800 million WFBIT

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const token   = new ethers.Contract(WFBIT, ERC20_ABI, deployer);
  const balance = await token.balanceOf(deployer.address);
  console.log("WFBIT balance:", ethers.formatUnits(balance, 6), "WFBIT");

  if (balance < AMOUNT) {
    console.error("Insufficient WFBIT balance!");
    process.exit(1);
  }

  // ── Step 1: Approve ────────────────────────────────────────────────────────
  const allowance = await token.allowance(deployer.address, STAKING);
  if (allowance < AMOUNT) {
    console.log("\nApproving 800M WFBIT...");
    const approveTx = await token.approve(STAKING, AMOUNT, {
      maxFeePerGas:         ethers.parseUnits("300", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("100", "gwei"),
    });
    console.log("Approve tx:", approveTx.hash);
    await approveTx.wait();
    console.log("Approved.");
  } else {
    console.log("Allowance already sufficient, skipping approve.");
  }

  // ── Step 2: depositReserve ─────────────────────────────────────────────────
  const staking = await ethers.getContractAt("FBiTStaking", STAKING);
  console.log("\nCalling depositReserve(800,000,000 WFBIT)...");
  const tx = await staking.depositReserve(AMOUNT, {
    maxFeePerGas:         ethers.parseUnits("300", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("100", "gwei"),
    gasLimit: 200_000,
  });
  console.log("Tx:", tx.hash);
  await tx.wait();

  // ── Verify ─────────────────────────────────────────────────────────────────
  const reserve = await staking.totalReserve();
  const pool    = await staking.rewardPoolBalance();
  console.log("\n✓ Reserve funded!");
  console.log("  totalReserve:      ", ethers.formatUnits(reserve, 6), "WFBIT");
  console.log("  rewardPoolBalance: ", ethers.formatUnits(pool, 6), "WFBIT");
  console.log("  emissionStartTime set — annual clock has started.");
}

main().catch((err) => { console.error(err); process.exit(1); });
