/**
 * Verifies function selectors against on-chain bytecode.
 * Checks if our ABI matches what's actually deployed.
 */
const { ethers } = require("ethers");

const STAKING = "0xb86DA67406DaD482428704c14AdA269E9653FDca";
const RPC     = "https://polygon-bor-rpc.publicnode.com";

// Our frontend ABI signatures to verify
const SIGS = [
  "claimRewards(uint256)",
  "compoundRewards(uint256)",
  "unstake(uint256)",
  "stake(uint256)",
  "registerUser(address)",
  "getUserStakes(address)",
  "getPendingReward(address,uint256)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);

  // Get the contract bytecode
  const code = await provider.getCode(STAKING);
  console.log("Contract deployed:", code.length > 2 ? "YES" : "NO (no bytecode!)");
  console.log("Bytecode length:", code.length, "chars\n");

  if (code.length <= 2) {
    console.error("Contract not deployed at this address on Polygon mainnet!");
    return;
  }

  // Check each function selector against bytecode
  console.log("=== Function Selector Verification ===");
  console.log("(if selector appears in bytecode, the function likely exists in the contract)\n");

  for (const sig of SIGS) {
    const selector = ethers.id(sig).slice(0, 10); // first 4 bytes = 0x + 8 hex chars
    const found = code.includes(selector.slice(2)); // search without 0x prefix
    const status = found ? "✓ FOUND" : "✗ NOT FOUND (ABI mismatch!)";
    console.log(`${sig.padEnd(45)} selector=${selector}  ${status}`);
  }

  // Also try to read contract state to confirm it responds
  const iface = new ethers.Interface([
    "function CLAIM_INTERVAL() external view returns (uint256)",
    "function getUserStakes(address) external view returns (tuple(uint256,uint8,uint256,uint256,uint256,uint256,bool,uint256)[])",
    "function getPendingReward(address,uint256) external view returns (uint256)",
  ]);

  const provider2 = new ethers.JsonRpcProvider(RPC);

  // Try getPendingReward with stakeId=0 for a dummy address to see the revert reason
  console.log("\n=== getPendingReward revert test (stakeId=0, dummy addr) ===");
  const dummyAddr = "0x0000000000000000000000000000000000000001";
  for (const testId of [0n, 1n]) {
    try {
      const calldata = iface.encodeFunctionData("getPendingReward", [dummyAddr, testId]);
      const result = await provider2.call({ to: STAKING, data: calldata });
      const decoded = iface.decodeFunctionResult("getPendingReward", result);
      console.log(`getPendingReward(dummy, ${testId}) = ${ethers.formatUnits(decoded[0], 6)} WFBIT`);
    } catch(e) {
      const reason = e.reason || e.data || e.shortMessage || e.message?.slice(0, 100);
      console.log(`getPendingReward(dummy, ${testId}) REVERTED: "${reason}"`);
    }
  }
}

main().catch(e => { console.error("Fatal:", e.message); });
