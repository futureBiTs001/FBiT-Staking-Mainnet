const { ethers } = require("hardhat");

const WFBIT = "0xa31b5A95268CAd709e6691Ec2F2F107A3F36D945";
const ANNUAL_EMISSION = ethers.parseUnits("1000000", 6); // 1M WFBIT year-1

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "MATIC");

  const nonce = await ethers.provider.getTransactionCount(deployer.address, "pending");
  console.log("Nonce:", nonce);

  console.log("\nDeploying FBiTStaking with WFBIT token...");
  const Factory = await ethers.getContractFactory("FBiTStaking");
  const contract = await Factory.deploy(
    WFBIT,           // _stakeToken
    WFBIT,           // _rewardToken
    0,               // _rewardRate (unused, APY-based)
    0,               // _referralRewardRate (set on-chain default)
    ANNUAL_EMISSION, // _annualEmission
    {
      gasLimit: 6_000_000,
      maxFeePerGas:         ethers.parseUnits("400", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("150", "gwei"),
      nonce,
    }
  );

  console.log("Tx:", contract.deploymentTransaction().hash);
  console.log("Waiting for confirmation...");
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("\n✓ FBiTStaking (WFBIT) deployed at:", address);
  console.log("\nVerify:");
  console.log(`  npx hardhat verify --network polygon_mainnet ${address} "${WFBIT}" "${WFBIT}" 0 0 "${ANNUAL_EMISSION}"`);
  console.log("\nUpdate .env.local:");
  console.log("  NEXT_PUBLIC_POLYGON_CONTRACT_ADDRESS=" + address);
}

main().catch((err) => { console.error(err); process.exit(1); });
