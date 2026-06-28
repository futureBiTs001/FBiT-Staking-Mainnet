'use client';

/**
 * useTokenLogo
 *
 * Fetches the token logo from the source the smart contract uses:
 *   • Solana  → Metaplex DAS API  (reads on-chain metadata URI → image)
 *              then falls back to DexScreener info.imageUrl
 *   • Polygon → DexScreener info.imageUrl
 *              then falls back to Trust Wallet asset repo
 *
 * Returns null when the token address is not set or the logo cannot be fetched.
 */

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { NETWORK_CONFIG } from '@/lib/config';

export interface TokenLogoState {
  logoUrl: string | null;
  tokenName: string | null;
  tokenSymbol: string | null;
  isLoading: boolean;
  source: 'metaplex' | 'dexscreener' | 'trustwallet' | 'none' | null;
}

function isPlaceholder(addr: string) {
  return !addr || addr.length < 10;
}

// ─── Solana: Metaplex DAS API ─────────────────────────────────────────────────
async function fetchSolanaMetaplexLogo(
  rpcUrl: string,
  mintAddress: string,
  signal: AbortSignal
): Promise<{ logoUrl: string | null; name: string | null; symbol: string | null }> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'fbit-logo',
      method: 'getAsset',
      params: { id: mintAddress },
    }),
    signal,
  });

  if (!res.ok) return { logoUrl: null, name: null, symbol: null };
  const data = await res.json();
  const result = data?.result;

  const name   = result?.content?.metadata?.name   ?? null;
  const symbol = result?.content?.metadata?.symbol ?? null;

  const directImage = result?.content?.links?.image ?? null;
  if (directImage && directImage.startsWith('http')) {
    return { logoUrl: directImage, name, symbol };
  }

  const jsonUri = result?.content?.json_uri ?? null;
  if (jsonUri && jsonUri.startsWith('http')) {
    try {
      const metaRes = await fetch(jsonUri, { cache: 'force-cache', signal });
      if (metaRes.ok) {
        const meta = await metaRes.json();
        if (meta?.image && meta.image.startsWith('http')) {
          return { logoUrl: meta.image, name: meta.name ?? name, symbol: meta.symbol ?? symbol };
        }
      }
    } catch {
      // ignore
    }
  }

  return { logoUrl: null, name, symbol };
}

// ─── DexScreener: info.imageUrl (both chains) ────────────────────────────────
async function fetchDexScreenerLogo(
  tokenAddress: string,
  signal: AbortSignal
): Promise<{ logoUrl: string | null; name: string | null; symbol: string | null }> {
  const res = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
    { cache: 'no-store', signal }
  );
  if (!res.ok) return { logoUrl: null, name: null, symbol: null };
  const data = await res.json();

  const pair = data?.pairs?.[0];
  const logoUrl = pair?.info?.imageUrl ?? null;
  const name    = pair?.baseToken?.name   ?? null;
  const symbol  = pair?.baseToken?.symbol ?? null;

  return { logoUrl, name, symbol };
}

// ─── Trust Wallet GitHub (Polygon/EVM fallback) ───────────────────────────────
async function fetchTrustWalletLogo(
  tokenAddress: string,
  signal: AbortSignal,
  chain: 'polygon' | 'ethereum' = 'polygon'
): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chain}/assets/${tokenAddress}/logo.png`;
  try {
    const res = await fetch(url, { method: 'HEAD', signal });
    return res.ok ? url : null;
  } catch {
    return null;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useTokenLogo(): TokenLogoState {
  const { selectedNetwork } = useAppStore();
  const [state, setState] = useState<TokenLogoState>({
    logoUrl: null,
    tokenName: null,
    tokenSymbol: null,
    isLoading: true,
    source: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel any in-flight fetch when network changes
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState({ logoUrl: null, tokenName: null, tokenSymbol: null, isLoading: true, source: null });

    const config = NETWORK_CONFIG[selectedNetwork];
    const tokenAddress = config.stakeTokenAddress;

    if (isPlaceholder(tokenAddress)) {
      setState(s => ({ ...s, isLoading: false, source: 'none' }));
      return;
    }

    const signal = abortRef.current!.signal;

    (async () => {
      try {
        if (selectedNetwork === 'solana') {
          const { logoUrl, name, symbol } = await fetchSolanaMetaplexLogo(config.rpcUrl, tokenAddress, signal);
          if (logoUrl) {
            setState({ logoUrl, tokenName: name, tokenSymbol: symbol, isLoading: false, source: 'metaplex' });
            return;
          }

          const ds = await fetchDexScreenerLogo(tokenAddress, signal);
          if (ds.logoUrl) {
            setState({ logoUrl: ds.logoUrl, tokenName: ds.name, tokenSymbol: ds.symbol, isLoading: false, source: 'dexscreener' });
            return;
          }
        } else {
          const ds = await fetchDexScreenerLogo(tokenAddress, signal);
          if (ds.logoUrl) {
            setState({ logoUrl: ds.logoUrl, tokenName: ds.name, tokenSymbol: ds.symbol, isLoading: false, source: 'dexscreener' });
            return;
          }

          const tw = await fetchTrustWalletLogo(tokenAddress, signal);
          if (tw) {
            setState({ logoUrl: tw, tokenName: null, tokenSymbol: null, isLoading: false, source: 'trustwallet' });
            return;
          }
        }

        if (!signal.aborted) setState(s => ({ ...s, isLoading: false, source: 'none' }));
      } catch (e: any) {
        // AbortError = component unmounted / network switched — no state update needed
        if (e?.name !== 'AbortError') {
          setState(s => ({ ...s, isLoading: false, source: 'none' }));
        }
      }
    })();
  }, [selectedNetwork]);

  return state;
}
