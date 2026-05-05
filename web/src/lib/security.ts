/**
 * Multi-layer security utilities for FBiT Staking.
 *
 * Layers:
 *  1. Rate limiting     — burst-spam prevention per action key
 *  2. Input sanitization — XSS / injection stripping
 *  3. Address validation — strict format checks (EVM & Solana)
 *  4. Amount validation  — NaN, negative, overflow, precision guards
 *  5. Error sanitization — never leak internal stack traces to users
 *  6. Limits             — hard caps on stake/reward amounts
 */

// ── 1. Rate Limiter ────────────────────────────────────────────────────────────

interface RateLimiterOptions {
  maxCalls: number;
  windowMs: number;
}

const DEFAULT_OPTIONS: RateLimiterOptions = { maxCalls: 3, windowMs: 30_000 };
const _callLog: Map<string, number[]> = new Map();

/**
 * Returns true if the action is allowed under the rate limit.
 * Call before any on-chain write. Returns false → show error toast.
 */
export function checkRateLimit(
  key: string,
  opts: RateLimiterOptions = DEFAULT_OPTIONS
): boolean {
  const now = Date.now();
  const log = (_callLog.get(key) ?? []).filter(t => now - t < opts.windowMs);
  if (log.length >= opts.maxCalls) return false;
  log.push(now);
  _callLog.set(key, log);
  return true;
}

export function resetRateLimit(key: string): void {
  _callLog.delete(key);
}

// ── 2. Input Sanitization ──────────────────────────────────────────────────────

/**
 * Strip HTML tags, JS URL schemes, data: URLs, and inline event handlers.
 * Prevents stored-XSS if any value is rendered via innerHTML.
 */
export function sanitizeText(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')         // strip HTML tags
    .replace(/javascript\s*:/gi, '') // strip js: URL scheme
    .replace(/on\w+\s*=/gi, '')      // strip onerror=, onclick=, etc.
    .replace(/data\s*:/gi, '')       // strip data: URLs
    .replace(/vbscript\s*:/gi, '')   // strip vbscript: URL scheme
    .trim();
}

// ── 3. Address Validation ──────────────────────────────────────────────────────

/** EVM address: 0x + 40 hex chars */
export function isValidEVMAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr.trim());
}

/** Solana address: base58, 32–44 chars */
export function isValidSolanaAddress(addr: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr.trim());
}

/** Accepts either EVM or Solana address */
export function isValidWalletAddress(addr: string): boolean {
  return isValidEVMAddress(addr) || isValidSolanaAddress(addr);
}

/** Solana SPL token mint address (same format as wallet) */
export function isValidSolanaMint(mint: string): boolean {
  return isValidSolanaAddress(mint);
}

// ── 4. Amount Validation ───────────────────────────────────────────────────────

/** Maximum single stake — 500 million FBiT */
export const MAX_STAKE_AMOUNT = 500_000_000;

/** Minimum single stake — 1 FBiT */
export const MIN_STAKE_AMOUNT = 1;

/**
 * Returns true when amount is a finite positive number within allowed range
 * and with at most maxDecimals decimal places.
 */
export function isValidAmount(amount: number, maxDecimals = 6): boolean {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  if (amount < MIN_STAKE_AMOUNT || amount > MAX_STAKE_AMOUNT) return false;
  const str = amount.toString();
  const dot = str.indexOf('.');
  if (dot === -1) return true;
  return str.length - dot - 1 <= maxDecimals;
}

/** Validate a raw token amount (before decimals scaling) — must be positive bigint-safe integer */
export function isValidRawAmount(raw: bigint): boolean {
  return raw > 0n && raw <= BigInt(MAX_STAKE_AMOUNT) * 1_000_000n;
}

// ── 5. BPS Validation ─────────────────────────────────────────────────────────

/** Basis points: integer 0–10000 */
export function isValidBps(bps: number): boolean {
  return Number.isInteger(bps) && bps >= 0 && bps <= 10_000;
}

/** Team bonus BPS: integer 1–1000 (max 10%) */
export function isValidBonusBps(bps: number): boolean {
  return Number.isInteger(bps) && bps >= 1 && bps <= 1_000;
}

// ── 6. Error Sanitization ──────────────────────────────────────────────────────

/** Patterns in error messages that should never reach the user */
const _SENSITIVE_PATTERNS = [
  /0x[0-9a-fA-F]{40,}/g,          // raw EVM addresses in errors
  /private.?key/gi,
  /secret/gi,
  /mnemonic/gi,
  /seed.?phrase/gi,
  /Error: [A-Z_]{10,}/g,           // internal enum-style error codes
  /at\s+\w+\s+\([^)]+\)/g,        // stack trace frames
];

/**
 * Return a safe, user-facing error message.
 * Strips stack traces, private keys, internal codes, and raw addresses.
 */
export function sanitizeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  // Passthrough known user-friendly messages (contract-configured checks etc.)
  if (raw.includes('Contract not configured')) return raw;
  if (raw.includes('Too many')) return raw;
  if (raw.includes('Rate limit')) return raw;
  // Solana contract error passthroughs
  if (raw.includes('Stake amount is below minimum')) return 'Minimum stake is 1 FBiT.';
  if (raw.includes('Stake amount exceeds maximum')) return 'Maximum stake is 500,000,000 FBiT.';
  if (raw.includes('Invalid referral token account')) return 'Invalid referral account. Please try again.';
  if (raw.includes('BelowMinStake')) return 'Minimum stake is 1 FBiT.';
  if (raw.includes('AboveMaxStake')) return 'Maximum stake is 500,000,000 FBiT.';
  if (raw.includes('InvalidReferralATA')) return 'Invalid referral account. Please try again.';
  // Polygon contract error passthroughs
  if (raw.includes('Stake below minimum')) return 'Minimum stake is 1 FBiT.';
  if (raw.includes('Stake exceeds maximum')) return 'Maximum stake is 500,000,000 FBiT.';
  if (raw.includes('pool fully reserved for pending')) return 'Cannot withdraw: reward pool is fully reserved for pending user rewards.';
  if (raw.includes('Cooldown') || raw.includes('cooldown') || raw.includes('claim interval') || raw.includes('Claim interval')) return 'Claim cooldown not met — please wait until the 12h interval has passed.';
  if (raw.includes('Insufficient reward') || raw.includes('insufficient reward')) return 'Reward pool has insufficient balance. Please try again later.';
  if (raw.includes('User is blocked') || raw.includes('user is blocked')) return 'This wallet has been blocked from claiming.';
  if (raw.includes('No reward') || raw.includes('no reward') || raw.includes('Nothing to claim')) return 'No claimable reward yet. Rewards accrue every 12 hours.';
  if (raw.includes('Paused') || raw.includes('paused') || raw.includes('pausable')) return 'The staking contract is paused. Please try again later.';

  let safe = raw;
  for (const pattern of _SENSITIVE_PATTERNS) {
    safe = safe.replace(pattern, '[redacted]');
  }

  // Collapse to first sentence — stack frames come after newlines
  safe = safe.split('\n')[0].trim();

  // Cap length
  if (safe.length > 120) safe = safe.slice(0, 117) + '…';

  return safe || 'An unexpected error occurred. Please try again.';
}

// ── 7. Environment Guard ───────────────────────────────────────────────────────

/**
 * Warn in the console (dev-only) if critical env vars are missing.
 * Never throws — just logs so the app still loads.
 */
export function warnMissingEnv(): void {
  if (typeof window === 'undefined') return;
  const required = [
    'NEXT_PUBLIC_REOWN_PROJECT_ID',
    'NEXT_PUBLIC_SOLANA_STAKE_TOKEN_MINT',
    'NEXT_PUBLIC_POLYGON_STAKE_TOKEN',
  ];
  for (const key of required) {
    const val = process.env[key];
    if (!val || val.startsWith('YOUR_')) {
      console.warn(`[FBiT Security] Missing env var: ${key}`);
    }
  }
}
