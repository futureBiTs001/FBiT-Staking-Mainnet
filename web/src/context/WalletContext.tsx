'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useAppStore } from '@/lib/store';
import { getReferrerFromUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import { appKitModal, isInsideBinanceAppBrowser } from '@/lib/reown';

type WalletType = 'reown';

interface WalletContextType {
  connect: (walletType: WalletType) => Promise<void>;
  disconnect: () => void;
  address: string | null;
  solanaAddress: string | null;
  isConnecting: boolean;
  walletType: WalletType | null;
  solanaReferrer: string | null;
  setSolanaReferrer: (addr: string) => void;
}

const WalletContext = createContext<WalletContextType>({
  connect: async () => {},
  disconnect: () => {},
  address: null,
  solanaAddress: null,
  isConnecting: false,
  walletType: null,
  solanaReferrer: null,
  setSolanaReferrer: () => {},
});

export const useWallet = () => useContext(WalletContext);

// ── Admin address check ───────────────────────────────────────────────────────
// SECURITY: Admin list is a UI gate only — real enforcement is the smart
// contract's onlyOwner / onlyAuthority modifier. Set NEXT_PUBLIC_ADMIN_ADDRESS_HASHES
// in .env.local as a comma-separated list of SHA-256 hex digests (not raw addresses).
//
// Hashed rather than stored raw because NEXT_PUBLIC_* values are bundled directly
// into the public JS — a raw address list would let anyone reading the deployed
// bundle instantly identify the admin wallet as a phishing/social-engineering
// target. Hashing doesn't add cryptographic access control (the real boundary is
// the on-chain authority check), it just removes that free, zero-effort lookup.
const ADMIN_ADDRESS_HASHES = (process.env.NEXT_PUBLIC_ADMIN_ADDRESS_HASHES ?? '')
  .split(',')
  .map(a => a.trim().toLowerCase())
  .filter(Boolean);

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function isAdminAddress(addr: string): Promise<boolean> {
  if (!addr || ADMIN_ADDRESS_HASHES.length === 0) return false;
  const hash = await sha256Hex(addr); // Solana addresses are base58, case-sensitive
  return ADMIN_ADDRESS_HASHES.includes(hash);
}

// Exported so the AdminPanel can re-verify on every sensitive action
export { isAdminAddress };

export function WalletProvider({ children }: { children: ReactNode }) {
  const { setWallet, setIsAdmin, setActiveTab } = useAppStore();
  const [address, setAddress]           = useState<string | null>(null);
  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletType, setWalletType]     = useState<WalletType | null>(null);
  const [solanaReferrer, setSolanaReferrerState] = useState<string | null>(null);

  const walletTypeRef = useRef<WalletType | null>(null);
  useEffect(() => { walletTypeRef.current = walletType; }, [walletType]);

  useEffect(() => {
    const SOL_KEY = 'fbit-referrer-solana';

    const fromUrl = getReferrerFromUrl();
    const isSolanaFromUrl = !!fromUrl && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(fromUrl);

    // A valid match from the URL wins and is persisted; otherwise fall back
    // to whatever is already stored, so a malformed/unrelated `?ref=` param
    // never wipes out a legitimately stored referrer.
    if (isSolanaFromUrl) {
      setSolanaReferrerState(fromUrl);
      try { localStorage.setItem(SOL_KEY, fromUrl); } catch {}
    } else {
      try {
        const sol = localStorage.getItem(SOL_KEY);
        if (sol && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(sol)) setSolanaReferrerState(sol);
      } catch {}
    }

    if (fromUrl) setActiveTab('stake');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track the previously connected address so we can detect wallet switches
  const prevAddressRef = useRef<string | null>(null);

  // ── Reown / WalletConnect subscriptions ─────────────────────────────────────
  useEffect(() => {
    if (!appKitModal) return;
    const unsubAccount = appKitModal.subscribeAccount(async (account: { isConnected: boolean; address?: string }) => {
      if (account.isConnected && account.address) {
        // When a different wallet connects, clear any localStorage referrer so
        // stale referrers from a previous user's session are not inherited.
        if (prevAddressRef.current && prevAddressRef.current !== account.address) {
          setSolanaReferrerState(null);
          try { localStorage.removeItem('fbit-referrer-solana'); } catch {}
        }
        prevAddressRef.current = account.address;

        setAddress(account.address);
        setSolanaAddress(account.address);
        setWallet(account.address);
        setWalletType('reown');
        setIsAdmin(await isAdminAddress(account.address));
        setIsConnecting(false);
      } else if (!account.isConnected && walletTypeRef.current === 'reown') {
        setAddress(null);
        setSolanaAddress(null);
        setWallet(null);
        setWalletType(null);
        setIsAdmin(false);
      }
    });

    const unsubEvents = appKitModal.subscribeEvents((event: { data: { event: string } }) => {
      if (event.data.event === 'MODAL_CLOSE') setIsConnecting(false);
    });

    return () => { unsubAccount(); unsubEvents(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setWallet]);

  // ── Clear stale WalletConnect sessions from localStorage ────────────────────
  const clearWcSessions = () => {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('wc@') || k.startsWith('W3M') || k.startsWith('@w3m'))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
  };

  // ── Main connect entry-point ─────────────────────────────────────────────────
  const connect = useCallback(async (_type: WalletType) => {
    if (!appKitModal) throw new Error('WalletConnect is not available. Check your Reown project configuration.');
    setIsConnecting(true);
    try { await appKitModal.disconnect(); } catch {}
    clearWcSessions();
    if (isInsideBinanceAppBrowser()) {
      // Inside Binance's own in-app browser, Binance already injects its Solana
      // wallet directly (Wallet Standard) — picking the WalletConnect-routed
      // "Binance Web3 Wallet" entry instead tries to deep-link back out to
      // relaunch the app the user is already inside, which fails/bounces back.
      toast('Binance app detected — pick your wallet under "Installed", not "Binance Web3 Wallet".', { duration: 6000, icon: '👛' });
    }
    appKitModal.open({ view: 'Connect' });
  }, []);

  // ── Disconnect ───────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    try { appKitModal?.disconnect(); } catch {}
    clearWcSessions();
    setAddress(null);
    setSolanaAddress(null);
    setWallet(null);
    setWalletType(null);
    setIsAdmin(false);
    if (useAppStore.getState().activeTab === 'admin') setActiveTab('dashboard');
  }, [setWallet, setIsAdmin, setActiveTab]);

  const saveSolanaReferrer = useCallback((addr: string) => {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) return; // must be base58 Solana
    setSolanaReferrerState(addr);
    try { localStorage.setItem('fbit-referrer-solana', addr); } catch {}
  }, []);

  return (
    <WalletContext.Provider value={{
      connect, disconnect,
      address, solanaAddress, isConnecting, walletType,
      solanaReferrer,
      setSolanaReferrer: saveSolanaReferrer,
    }}>
      {children}
    </WalletContext.Provider>
  );
}
