import { NetworkConfig } from '@/types';

// ===== MAINNET CONFIGURATION =====
// NOTE: process.env.NEXT_PUBLIC_* must be written as static literals so
// Next.js's DefinePlugin can inline them at build time. Dynamic access
// (process.env[key]) is NOT replaced and reads as undefined in the browser.
// We call .trim() on every value to strip the \r\n that Vercel sometimes
// appends when env vars are set via the dashboard on Windows.
export const NETWORK_CONFIG: Record<string, NetworkConfig> = {
  solana: {
    name: 'Solana',
    type: 'solana',
    rpcUrl:             (process.env.NEXT_PUBLIC_SOLANA_RPC_URL           ?? 'https://api.mainnet-beta.solana.com').trim(),
    explorerUrl:        'https://explorer.solana.com',
    contractAddress:    (process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID        ?? '').trim(),
    stakeTokenAddress:  (process.env.NEXT_PUBLIC_SOLANA_STAKE_TOKEN_MINT  ?? '').trim(),
    rewardTokenAddress: (process.env.NEXT_PUBLIC_SOLANA_REWARD_TOKEN_MINT ?? '').trim(),
    stakeTokenSymbol:   'FBiT',
    stakeTokenDecimals: 6,
    stakeVaultAddress:   (process.env.NEXT_PUBLIC_SOLANA_STAKE_VAULT   ?? '').trim() || undefined,
    rewardVaultAddress:  (process.env.NEXT_PUBLIC_SOLANA_REWARD_VAULT  ?? '').trim() || undefined,
    reserveVaultAddress: (process.env.NEXT_PUBLIC_SOLANA_RESERVE_VAULT ?? '').trim() || undefined,
  },
  polygon: {
    name: 'Polygon',
    type: 'polygon',
    rpcUrl:             (process.env.NEXT_PUBLIC_POLYGON_RPC_URL          ?? 'https://polygon-bor-rpc.publicnode.com').trim(),
    chainId:            Number((process.env.NEXT_PUBLIC_POLYGON_CHAIN_ID  ?? '137').trim()),
    explorerUrl:        'https://polygonscan.com',
    contractAddress:    (process.env.NEXT_PUBLIC_POLYGON_CONTRACT_ADDRESS ?? '').trim(),
    stakeTokenAddress:  (process.env.NEXT_PUBLIC_POLYGON_STAKE_TOKEN      ?? '').trim(),
    rewardTokenAddress: (process.env.NEXT_PUBLIC_POLYGON_REWARD_TOKEN     ?? '').trim(),
    stakeTokenSymbol:   'WFBIT',
    stakeTokenDecimals: 6,
  },
};

export const getExplorerTxUrl = (network: string, txHash: string): string => {
  const config = NETWORK_CONFIG[network];
  return `${config?.explorerUrl ?? 'https://explorer.solana.com'}/tx/${txHash}`;
};
