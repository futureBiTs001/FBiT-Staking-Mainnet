import { NetworkConfig } from '@/types';

// Helius RPC URL — set NEXT_PUBLIC_HELIUS_API_KEY to enable.
// Get a free key at https://dev.helius.xyz
const _heliusKey = (process.env.NEXT_PUBLIC_HELIUS_API_KEY ?? '').trim();
export const HELIUS_RPC_URL = _heliusKey
  ? `https://mainnet.helius-rpc.com/?api-key=${_heliusKey}`
  : '';

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
    // If Helius key is set it takes priority; otherwise fall back to mainnet-beta.
    rpcUrl: HELIUS_RPC_URL || (process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com').trim(),
    explorerUrl:        'https://explorer.solana.com',
    contractAddress:    (process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID        ?? '').trim(),
    stakeTokenAddress:  (process.env.NEXT_PUBLIC_SOLANA_STAKE_TOKEN_MINT  ?? '').trim(),
    rewardTokenAddress: (process.env.NEXT_PUBLIC_SOLANA_REWARD_TOKEN_MINT ?? '').trim(),
    stakeTokenSymbol:   'FBiT',
    stakeTokenDecimals: 9,
    stakeVaultAddress:   (process.env.NEXT_PUBLIC_SOLANA_STAKE_VAULT   ?? '').trim() || undefined,
    rewardVaultAddress:  (process.env.NEXT_PUBLIC_SOLANA_REWARD_VAULT  ?? '').trim() || undefined,
    reserveVaultAddress: (process.env.NEXT_PUBLIC_SOLANA_RESERVE_VAULT ?? '').trim() || undefined,
  },
};

export const getExplorerTxUrl = (network: string, txHash: string): string => {
  const config = NETWORK_CONFIG[network];
  return `${config?.explorerUrl ?? 'https://explorer.solana.com'}/tx/${txHash}`;
};
