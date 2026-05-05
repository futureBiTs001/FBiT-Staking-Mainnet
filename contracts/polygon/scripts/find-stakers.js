/**
 * Finds all staker addresses by querying TokensStaked events on-chain.
 */
const { ethers } = require("hardhat");

const STAKING = "0xb86DA67406DaD482428704c14AdA269E9653FDca";

async function main() {
  const staking = await ethers.getContractAt("FBiTStaking", STAKING);
  const provider = staking.runner.provider;

  // Get current block
  const latest = await provider.getBlockNumber();
  console.log("Current block:", latest);

  // Search last 9,000 blocks in chunks (RPC limit = 10k)
  const CHUNK = 9000;
  const fromBlock = Math.max(0, latest - CHUNK * 3);
  console.log(`Querying TokensStaked events from block ${fromBlock} to ${latest}...`);

  const filter = staking.filters.TokensStaked();
  let events = [];
  for (let start = fromBlock; start < latest; start += CHUNK) {
    const end = Math.min(start + CHUNK - 1, latest);
    const chunk = await staking.queryFilter(filter, start, end);
    events = events.concat(chunk);
  }

  const stakers = new Set();
  for (const e of events) {
    stakers.add(e.args.user);
    console.log(`TokensStaked: user=${e.args.user}  stakeId=${e.args.stakeId}  amount=${ethers.formatUnits(e.args.amount, 6)}  block=${e.blockNumber}`);
  }

  console.log(`\nUnique stakers (${stakers.size}):`);
  for (const addr of stakers) console.log(" ", addr);
}

main().catch(e => { console.error(e); process.exit(1); });
