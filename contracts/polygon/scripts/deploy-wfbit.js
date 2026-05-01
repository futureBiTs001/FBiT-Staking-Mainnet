const { ethers } = require("hardhat");

const LOGO_URI = "https://ipfs.io/ipfs/QmNvMhxJqSVQ3R6AusZwL79Qy125rX5ND1sEJ4bcxknYJ4";

// Gas high enough to replace any existing pending tx (must be >110% of stuck tx gas)
const CANCEL_GAS    = { maxFeePerGas: ethers.parseUnits("500", "gwei"), maxPriorityFeePerGas: ethers.parseUnits("200", "gwei") };
const DEPLOY_GAS    = { maxFeePerGas: ethers.parseUnits("400", "gwei"), maxPriorityFeePerGas: ethers.parseUnits("150", "gwei") };

async function cancelPendingTx(signer, nonce) {
  console.log(`  Cancelling nonce ${nonce} (self-transfer 0 MATIC)...`);
  const tx = await signer.sendTransaction({
    to: signer.address,
    value: 0n,
    nonce,
    gasLimit: 21_000,
    ...CANCEL_GAS,
  });
  console.log(`  Cancel tx: ${tx.hash}`);
  await tx.wait();
  console.log(`  Nonce ${nonce} cancelled.`);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "MATIC");

  const confirmedNonce = await ethers.provider.getTransactionCount(deployer.address, "latest");
  const pendingNonce   = await ethers.provider.getTransactionCount(deployer.address, "pending");
  console.log(`Nonce confirmed=${confirmedNonce}  pending=${pendingNonce}`);

  // ── Step 1: cancel any stuck pending transactions ───────────────────────────
  if (pendingNonce > confirmedNonce) {
    console.log(`\nCancelling ${pendingNonce - confirmedNonce} stuck transaction(s)...`);
    for (let n = confirmedNonce; n < pendingNonce; n++) {
      await cancelPendingTx(deployer, n);
    }
    console.log("All stuck txs cancelled.\n");
  }

  // ── Step 2: deploy WFBIT ────────────────────────────────────────────────────
  const deployNonce = await ethers.provider.getTransactionCount(deployer.address, "pending");
  console.log("Deploying WrappedFuturebit (WFBIT) at nonce", deployNonce);
  console.log("Logo URI:", LOGO_URI);

  const Factory = await ethers.getContractFactory("WrappedFuturebit");
  const contract = await Factory.deploy(deployer.address, LOGO_URI, {
    gasLimit: 2_500_000,
    nonce: deployNonce,
    ...DEPLOY_GAS,
  });

  console.log("Tx submitted:", contract.deploymentTransaction().hash);
  console.log("Waiting for confirmation...");
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("\n✓ WrappedFuturebit (WFBIT) deployed at:", address);
  console.log("\nVerify with:");
  console.log(`  npx hardhat verify --network polygon_mainnet ${address} "${deployer.address}" "${LOGO_URI}"`);
  console.log("\nAdd to .env.local: NEXT_PUBLIC_POLYGON_WFBIT_ADDRESS=" + address);
}

main().catch((err) => { console.error(err); process.exit(1); });
