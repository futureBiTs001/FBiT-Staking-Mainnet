const { ethers } = require("hardhat");

const WFBIT   = "0xa31b5A95268CAd709e6691Ec2F2F107A3F36D945";
const STAKING = "0xb86DA67406DaD482428704c14AdA269E9653FDca";
const ZERO    = "0x0000000000000000000000000000000000000000";
const AMOUNT  = ethers.parseUnits("1", 6); // 1 WFBIT

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Wallet:", deployer.address);

  const token = new ethers.Contract(WFBIT, ERC20_ABI, deployer);
  const bal   = await token.balanceOf(deployer.address);
  console.log("WFBIT balance:", ethers.formatUnits(bal, 6), "WFBIT");

  const staking = await ethers.getContractAt("FBiTStaking", STAKING, deployer);

  // ── Step 1: Register if needed ─────────────────────────────────────────────
  const user = await staking.users(deployer.address);
  if (!user.isRegistered) {
    console.log("\nRegistering user...");
    const tx = await staking.registerUser(ZERO, {
      maxFeePerGas:         ethers.parseUnits("200", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("50",  "gwei"),
      gasLimit: 200_000,
    });
    console.log("Register tx:", tx.hash);
    await tx.wait();
    console.log("Registered.");
  } else {
    console.log("\nAlready registered.");
  }

  // ── Step 2: Approve ────────────────────────────────────────────────────────
  const allowance = await token.allowance(deployer.address, STAKING);
  if (allowance < AMOUNT) {
    console.log("\nApproving 1 WFBIT...");
    const tx = await token.approve(STAKING, AMOUNT, {
      maxFeePerGas:         ethers.parseUnits("200", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("50",  "gwei"),
    });
    console.log("Approve tx:", tx.hash);
    await tx.wait();
    console.log("Approved.");
  } else {
    console.log("Allowance already sufficient.");
  }

  // ── Step 3: Stake ──────────────────────────────────────────────────────────
  console.log("\nStaking 1 WFBIT...");
  const tx = await staking.stake(AMOUNT, {
    maxFeePerGas:         ethers.parseUnits("200", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("50",  "gwei"),
    gasLimit: 400_000,
  });
  console.log("Stake tx:", tx.hash);
  const receipt = await tx.wait();
  console.log("Staked! Block:", receipt.blockNumber);

  // ── Verify ─────────────────────────────────────────────────────────────────
  const stakes = await staking.getUserStakes(deployer.address);
  console.log("\n✓ User stakes:", stakes.length);
  for (const [i, s] of stakes.entries()) {
    console.log(`  [${i}] amount=${ethers.formatUnits(s.amount, 6)} WFBIT  active=${s.isActive}  apy=${s.apy}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
