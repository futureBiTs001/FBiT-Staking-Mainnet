'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { useAppStore } from '@/lib/store';
import { NETWORK_CONFIG } from '@/lib/config';

const REFRESH_INTERVAL_MS = 30_000; // 30 s

export interface DexPair {
  dexId: string;
  pairAddress: string;
  quoteSymbol: string;
  priceUsd: string;
  priceChange24h: number;
  volume24h: number;
  liquidityUsd: number;
  txns24h: { buys: number; sells: number };
  url: string;
}

export interface TokenPriceData {
  pairs: DexPair[];
  logoUrl: string | null;
  lastUpdated: number | null;
  isLoading: boolean;
  error: string | null;
  source: 'geckoterminal' | 'onchain' | 'mock';
}

// ── GeckoTerminal network IDs ─────────────────────────────────────────────────
const GECKO_NETWORK: Record<string, string> = {
  solana: 'solana',
};

// ── Hardcoded FBiT pool addresses on Solana (always fetched first) ────────────
// ECUsT6sd... is the current live pool for the FBiT mint (switched 2026-08-26 — the
// prior 5ZA1NsMv... pool had negligible real liquidity; this one holds real reserves,
// ~70,000 FBiT / ~70 SOL, verified on-chain) — pinned to the front in parseGeckoPools()
// below regardless of liquidity ranking.
const FBIT_SOLANA_POOLS = [
  'ECUsT6sdz9rAj7tPfHnnHwxdkLaDcafHEfWZEdzc7hQx',
];
/** Exported so other callers (e.g. the landing page stats row) price the same pool. */
export const PINNED_FBIT_POOL = FBIT_SOLANA_POOLS[0];

// ── GeckoTerminal multi-pool fetch ────────────────────────────────────────────
async function fetchGeckoMultiPools(network: string, poolAddresses: string[]): Promise<DexPair[]> {
  const geckoNet  = GECKO_NETWORK[network] ?? network;
  const addresses = poolAddresses.join(',');
  const res = await fetch(
    `https://api.geckoterminal.com/api/v2/networks/${geckoNet}/pools/multi/${addresses}?include=dex`,
    { headers: { Accept: 'application/json' }, cache: 'no-store' }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return parseGeckoPools(data, network);
}

// ── GeckoTerminal parsers ─────────────────────────────────────────────────────
function parseGeckoPools(data: any, network: string): DexPair[] {
  if (!data?.data?.length) return [];

  const dexNames: Record<string, string> = {};
  for (const inc of data.included ?? []) {
    if (inc.type === 'dex') dexNames[inc.id] = inc.attributes?.name ?? inc.id;
  }

  const geckoNet = GECKO_NETWORK[network] ?? network;

  return (data.data as any[])
    .filter((p: any) => p.attributes?.base_token_price_usd)
    .map((p: any): DexPair => {
      const attr     = p.attributes;
      const dexId    = p.relationships?.dex?.data?.id ?? 'Unknown';
      const poolAddr = attr?.address ?? p.id?.split('_').slice(1).join('_') ?? '';
      return {
        dexId:          dexNames[dexId] ?? dexId,
        pairAddress:    poolAddr,
        quoteSymbol:    (attr.name as string ?? '').split(' / ')[1] ?? 'USD',
        priceUsd:       String(attr.base_token_price_usd ?? '0'),
        priceChange24h: parseFloat(attr.price_change_percentage?.h24 ?? '0'),
        volume24h:      parseFloat(attr.volume_usd?.h24 ?? '0'),
        liquidityUsd:   parseFloat(attr.reserve_in_usd ?? '0'),
        txns24h: {
          buys:  Number(attr.transactions?.h24?.buys  ?? 0),
          sells: Number(attr.transactions?.h24?.sells ?? 0),
        },
        url: `https://www.geckoterminal.com/${geckoNet}/pools/${poolAddr}`,
      };
    })
    .sort((a, b) => {
      if (a.pairAddress === PINNED_FBIT_POOL) return -1;
      if (b.pairAddress === PINNED_FBIT_POOL) return 1;
      return b.liquidityUsd - a.liquidityUsd;
    })
    .slice(0, 6);
}

function parseGeckoSearch(data: any, network: string): DexPair[] {
  if (!data?.data?.length) return [];
  const geckoNet = GECKO_NETWORK[network] ?? network;

  return (data.data as any[])
    .filter((p: any) => {
      const net = p.relationships?.network?.data?.id ?? '';
      return net === geckoNet && p.attributes?.base_token_price_usd;
    })
    .map((p: any): DexPair => {
      const attr     = p.attributes;
      const poolAddr = attr?.address ?? '';
      return {
        dexId:          attr.dex_id ?? attr.name?.split(' / ')[0] ?? 'DEX',
        pairAddress:    poolAddr,
        quoteSymbol:    (attr.name as string ?? '').split(' / ')[1] ?? 'USD',
        priceUsd:       String(attr.base_token_price_usd ?? '0'),
        priceChange24h: parseFloat(attr.price_change_percentage?.h24 ?? '0'),
        volume24h:      parseFloat(attr.volume_usd?.h24 ?? '0'),
        liquidityUsd:   parseFloat(attr.reserve_in_usd ?? '0'),
        txns24h: {
          buys:  Number(attr.transactions?.h24?.buys  ?? 0),
          sells: Number(attr.transactions?.h24?.sells ?? 0),
        },
        url: `https://www.geckoterminal.com/${geckoNet}/pools/${poolAddr}`,
      };
    })
    .sort((a, b) => {
      if (a.pairAddress === PINNED_FBIT_POOL) return -1;
      if (b.pairAddress === PINNED_FBIT_POOL) return 1;
      return b.liquidityUsd - a.liquidityUsd;
    })
    .slice(0, 6);
}

async function fetchGeckoTokenLogo(network: string, tokenAddress: string): Promise<string | null> {
  try {
    const geckoNet = GECKO_NETWORK[network] ?? network;
    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/${geckoNet}/tokens/${tokenAddress}`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const img = data?.data?.attributes?.image_url;
    return typeof img === 'string' && img.startsWith('http') ? img : null;
  } catch {
    return null;
  }
}

// ── On-chain price/liquidity (authoritative, Solana only) ────────────────────
// GeckoTerminal hasn't computed a real price for PINNED_FBIT_POOL yet — it has
// no trades before the pool's own on-chain activation time (see /launch's
// countdown), even though it already holds real reserves. GeckoTerminal's
// filter drops any pool with base_token_price_usd falsy, which 0.0 is, so the
// pinned-pool lookup below silently falls through to a *different*, nearly-
// empty pool via the token/symbol-search fallbacks — a confident-looking but
// wrong price. Reading the pool's vault balances directly avoids depending on
// GeckoTerminal having indexed this specific pool at all.
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const METEORA_POOL_OWNER = 'cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG';

async function fetchSolUsdPrice(): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/simple/networks/solana/token_price/${SOL_MINT}`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const price = Number(data?.data?.attributes?.token_prices?.[SOL_MINT]);
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch {
    return null;
  }
}

async function fetchOnChainPoolPrice(): Promise<DexPair | null> {
  try {
    const connection = new Connection(NETWORK_CONFIG.solana.rpcUrl, 'confirmed');
    const poolPubkey  = new PublicKey(PINNED_FBIT_POOL);
    const poolInfo    = await connection.getAccountInfo(poolPubkey);
    if (!poolInfo || poolInfo.owner.toBase58() !== METEORA_POOL_OWNER) return null;

    // Meteora cp-amm Pool account layout (offsets after the 8-byte discriminator),
    // verified directly against this pool's on-chain bytes this session:
    //   168 token_a_mint, 200 token_b_mint, 232 token_a_vault, 264 token_b_vault
    const buf = poolInfo.data;
    const tokenAMint  = new PublicKey(buf.subarray(168, 200)).toBase58();
    const tokenBMint  = new PublicKey(buf.subarray(200, 232)).toBase58();
    const tokenAVault = new PublicKey(buf.subarray(232, 264));
    const tokenBVault = new PublicKey(buf.subarray(264, 296));

    const [vaultABal, vaultBBal, solUsd] = await Promise.all([
      connection.getTokenAccountBalance(tokenAVault),
      connection.getTokenAccountBalance(tokenBVault),
      fetchSolUsdPrice(),
    ]);
    if (!solUsd) return null;

    const aAmount = vaultABal.value.uiAmount ?? 0;
    const bAmount = vaultBBal.value.uiAmount ?? 0;
    // Whichever side is native SOL sets the USD anchor for the whole pool.
    const solAmount  = tokenAMint === SOL_MINT ? aAmount : (tokenBMint === SOL_MINT ? bAmount : null);
    const fbitAmount = tokenAMint === SOL_MINT ? bAmount : aAmount;
    if (solAmount === null || fbitAmount <= 0) return null;

    const solValueUsd   = solAmount * solUsd;
    const fbitPriceUsd  = solValueUsd / fbitAmount;
    const liquidityUsd  = solValueUsd * 2; // balanced pool — both sides worth roughly the same

    return {
      dexId:          'Meteora',
      pairAddress:    PINNED_FBIT_POOL,
      quoteSymbol:    'SOL',
      priceUsd:       fbitPriceUsd.toString(),
      priceChange24h: 0, // not derivable from a single on-chain snapshot
      volume24h:      0,
      liquidityUsd,
      txns24h: { buys: 0, sells: 0 },
      url: `https://www.geckoterminal.com/solana/pools/${PINNED_FBIT_POOL}`,
    };
  } catch {
    return null;
  }
}

// Runs the actual GeckoTerminal fallback chain for one network and returns
// the resulting state (never throws — always resolves to a usable value).
async function fetchPriceData(network: string): Promise<TokenPriceData> {
  const config       = NETWORK_CONFIG[network];
  const tokenAddress = config?.stakeTokenAddress ?? '';
  const geckoNet     = GECKO_NETWORK[network] ?? network;
  const hasAddress   = tokenAddress.length > 10;

  // ── 0. On-chain reserves for our own pinned pool (Solana, authoritative) ──
  // Tried first — see fetchOnChainPoolPrice's comment for why GeckoTerminal
  // can't be trusted for this specific pool yet.
  if (network === 'solana') {
    const onChainPair = await fetchOnChainPoolPrice();
    if (onChainPair) {
      const logoUrl = hasAddress ? await fetchGeckoTokenLogo('solana', tokenAddress) : null;
      return { pairs: [onChainPair], logoUrl, lastUpdated: Date.now(), isLoading: false, error: null, source: 'onchain' };
    }
  }

  // ── 1. GeckoTerminal — hardcoded FBiT pool addresses (Solana) ───────────
  if (network === 'solana') {
    try {
      const pairs = await fetchGeckoMultiPools('solana', FBIT_SOLANA_POOLS);
      if (pairs.length > 0) {
        const logoUrl = hasAddress ? await fetchGeckoTokenLogo('solana', tokenAddress) : null;
        return { pairs, logoUrl, lastUpdated: Date.now(), isLoading: false, error: null, source: 'geckoterminal' };
      }
    } catch { /* fall through */ }
  }

  // ── 2. GeckoTerminal by token address ────────────────────────────────────
  if (hasAddress) {
    try {
      const [poolsRes, logoUrl] = await Promise.all([
        fetch(
          `https://api.geckoterminal.com/api/v2/networks/${geckoNet}/tokens/${tokenAddress}/pools` +
          `?page=1&include=dex`,
          { headers: { Accept: 'application/json' }, cache: 'no-store' }
        ),
        fetchGeckoTokenLogo(network, tokenAddress),
      ]);

      if (poolsRes.ok) {
        const data  = await poolsRes.json();
        const pairs = parseGeckoPools(data, network);
        if (pairs.length > 0) {
          return { pairs, logoUrl, lastUpdated: Date.now(), isLoading: false, error: null, source: 'geckoterminal' };
        }
      }
    } catch { /* fall through */ }
  }

  // ── 3. GeckoTerminal search by symbol "FBiT" ─────────────────────────────
  try {
    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/search/pools?query=FBiT&network=${geckoNet}&page=1`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' }
    );
    if (res.ok) {
      const data  = await res.json();
      const pairs = parseGeckoSearch(data, network);
      if (pairs.length > 0) {
        return { pairs, logoUrl: null, lastUpdated: Date.now(), isLoading: false, error: null, source: 'geckoterminal' };
      }
    }
  } catch { /* fall through */ }

  // ── All sources failed — empty state ─────────────────────────────────────
  return { pairs: [], logoUrl: null, lastUpdated: Date.now(), isLoading: false, error: 'No price data available', source: 'mock' };
}

// Multiple components (LandingStats, LiveTicker, …) call this hook at once,
// each on its own mount timer. Without sharing in-flight requests, a single
// page load fires the same GeckoTerminal calls twice — the extra load makes
// it easier to trip GeckoTerminal's rate limit on a cold, uncached visit
// (e.g. a first-time crawl). Keyed by network so this stays correct if a
// network switch is ever reintroduced.
const inFlightByNetwork = new Map<string, Promise<TokenPriceData>>();

function fetchPriceDeduped(network: string): Promise<TokenPriceData> {
  const existing = inFlightByNetwork.get(network);
  if (existing) return existing;

  const promise = fetchPriceData(network).finally(() => {
    inFlightByNetwork.delete(network);
  });
  inFlightByNetwork.set(network, promise);
  return promise;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useTokenPrice(): TokenPriceData & { refresh: () => void } {
  const { selectedNetwork } = useAppStore();
  const [state, setState] = useState<TokenPriceData>({
    pairs: [],
    logoUrl: null,
    lastUpdated: null,
    isLoading: true,
    error: null,
    source: 'mock',
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPrice = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    const result = await fetchPriceDeduped(selectedNetwork);
    setState(result);
  }, [selectedNetwork]);

  useEffect(() => {
    fetchPrice();
    timerRef.current = setInterval(fetchPrice, REFRESH_INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchPrice]);

  return { ...state, refresh: fetchPrice };
}
