import { NetworkConfig } from '@/types';

function e(key: string, fallback = ''): string {
  return (process.env[key] ?? fallback).trim();
}

// ===== MAINNET CONFIGURATION =====
export const NETWORK_CONFIG: Record<string, NetworkConfig> = {
  solana: {
    name: 'Solana',
    type: 'solana',
    rpcUrl:             e('NEXT_PUBLIC_SOLANA_RPC_URL',          'https://api.mainnet-beta.solana.com'),
    explorerUrl:        'https://explorer.solana.com',
    contractAddress:    e('NEXT_PUBLIC_SOLANA_PROGRAM_ID'),
    stakeTokenAddress:  e('NEXT_PUBLIC_SOLANA_STAKE_TOKEN_MINT'),
    rewardTokenAddress: e('NEXT_PUBLIC_SOLANA_REWARD_TOKEN_MINT'),
    stakeTokenSymbol:   'FBiT',
    stakeTokenDecimals: 6,
    stakeVaultAddress:   e('NEXT_PUBLIC_SOLANA_STAKE_VAULT')  || undefined,
    rewardVaultAddress:  e('NEXT_PUBLIC_SOLANA_REWARD_VAULT') || undefined,
    reserveVaultAddress: e('NEXT_PUBLIC_SOLANA_RESERVE_VAULT') || undefined,
  },
  polygon: {
    name: 'Polygon',
    type: 'polygon',
    rpcUrl:             e('NEXT_PUBLIC_POLYGON_RPC_URL',          'https://polygon-bor-rpc.publicnode.com'),
    chainId:            Number(e('NEXT_PUBLIC_POLYGON_CHAIN_ID',  '137')),
    explorerUrl:        'https://polygonscan.com',
    contractAddress:    e('NEXT_PUBLIC_POLYGON_CONTRACT_ADDRESS'),
    stakeTokenAddress:  e('NEXT_PUBLIC_POLYGON_STAKE_TOKEN'),
    rewardTokenAddress: e('NEXT_PUBLIC_POLYGON_REWARD_TOKEN'),
    stakeTokenSymbol:   'WFBIT',
    stakeTokenDecimals: 6,
  },
};

export const getExplorerTxUrl = (network: string, txHash: string): string => {
  const config = NETWORK_CONFIG[network];
  return `${config?.explorerUrl ?? 'https://explorer.solana.com'}/tx/${txHash}`;
};
