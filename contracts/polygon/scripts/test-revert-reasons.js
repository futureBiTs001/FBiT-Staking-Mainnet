/**
 * Checks what revert reason the contract gives for claimRewards(0) and claimRewards(1)
 * for a given address. This tells us definitively if the stakeId is off-by-one.
 */
const { ethers } = require("ethers");

const STAKING = "0xb86DA67406DaD482428704c14AdA269E9653FDca";
const RPC     = "https://polygon-bor-rpc.publicnode.com";

const ABI = [
  "function claimRewards(uint256 stakeId) external",
  `function getUserStakes(address) external view returns (
    tuple(uint256 amount, uint8 lockPeriodIndex, uint256 stakedAt, uint256 unlockAt,
          uint256 lastClaimAt, uint256 totalClaimed, bool isActive, uint256 apy)[]
  )`,
  "function CLAIM_INTERVAL() external view returns (uint256)",
  "function getPendingReward(address, uint256) external view returns (uint256)",
];

const USER = process.env.USER_ADDR || "0x0000000000000000000000000000000000000001";

async function checkCall(provider, iface, fnName, args, from) {
  const calldata = iface.encodeFunctionData(fnName, args);
  try {
    const result = await provider.call({ to: STAKING, from, data: calldata });
    const decoded = iface.decodeFunctionResult(fnName, result);
    return { ok: true, result: decoded };
  } catch (err) {
    return {
      ok: false,
      code: err?.code,
      reason: err?.reason,
      shortMessage: err?.shortMessage,
      message: err?.message?.slice(0, 150),
      data: err?.data,
    };
  }
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const iface = new ethers.Interface(ABI);
  const fmt = v => ethers.formatUnits(v, 6);

  console.log("Testing with USER:", USER);
  console.log("RPC:", RPC, "\n");

  // Get stakes
  const stakesResult = await checkCall(provider, iface, "getUserStakes", [USER], USER);
  if (!stakesResult.ok) {
    console.log("getUserStakes FAILED:", stakesResult);
    return;
  }
  const stakes = stakesResult.result[0];
  console.log(`getUserStakes: ${stakes.length} stakes\n`);
  for (const [i, s] of stakes.entries()) {
    console.log(`  [${i}] amount=${fmt(s.amount)} isActive=${s.isActive} lastClaimAt=${new Date(Number(s.lastClaimAt)*1000).toISOString()}`);
  }

  console.log("\n--- claimRewards revert reason probes ---\n");
  for (const stakeId of [0n, 1n, 2n]) {
    const r = await checkCall(provider, iface, "claimRewards", [stakeId], USER);
    if (r.ok) {
      console.log(`claimRewards(${stakeId}): ✓ SUCCESS (would execute)`);
    } else {
      console.log(`claimRewards(${stakeId}): ✗`);
      console.log(`  code:         ${r.code}`);
      console.log(`  reason:       "${r.reason}"`);
      console.log(`  shortMessage: "${r.shortMessage}"`);
      console.log(`  message:      "${r.message}"`);
      console.log(`  data:         ${r.data}`);
    }
    console.log();
  }

  console.log("--- getPendingReward probes ---\n");
  for (const stakeId of [0n, 1n, 2n]) {
    const r = await checkCall(provider, iface, "getPendingReward", [USER, stakeId], USER);
    if (r.ok) {
      console.log(`getPendingReward(${stakeId}): ${fmt(r.result[0])} WFBIT`);
    } else {
      console.log(`getPendingReward(${stakeId}): REVERT ${r.reason || r.shortMessage}`);
    }
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
