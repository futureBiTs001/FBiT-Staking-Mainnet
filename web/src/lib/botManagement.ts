/**
 * Multi-Layer Bot Management System — FBiT Staking
 *
 * Layer 1 · Browser Fingerprinting   — WebDriver / headless tool detection
 * Layer 2 · Behavioral Analysis      — mouse, keyboard, scroll humanness scoring
 * Layer 3 · Sliding-Window Limiter   — per-action burst prevention
 * Layer 4 · Logic Abuse Guard        — rapid-cycling & repeated-failure detection
 * Layer 5 · PoW Challenge            — SubtleCrypto SHA-256 proof-of-work
 * Layer 6 · Session Risk Engine      — unified scoring & action gating
 */

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'blocked';

export interface BotAssessment {
  riskLevel: RiskLevel;
  /** 0 = safe, 100 = definite bot */
  score: number;
  signals: string[];
  requiresChallenge: boolean;
  blocked: boolean;
}

export interface PowChallenge {
  challenge: string;
  difficulty: number;
}

export interface PowSolution {
  nonce: number;
  hash: string;
}

export interface ActionResult {
  allowed: boolean;
  reason?: string;
  requiresChallenge?: boolean;
  retryAfterMs?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 1 · Browser Fingerprinting
// ─────────────────────────────────────────────────────────────────────────────

function runFingerprint(): { score: number; signals: string[] } {
  if (typeof window === 'undefined') return { score: 0, signals: [] };

  const signals: string[] = [];
  let score = 0;

  const nav = navigator as any;
  const win = window as any;

  // Automation tool markers
  if (nav.webdriver)                                                          { signals.push('webdriver');          score += 40; }
  if (win.__playwright || win.__pwInitScripts || win.__pw_manual_tests_handle){ signals.push('playwright');         score += 50; }
  if (win.__puppeteer_evaluation_script__ || win._puppeteer)                  { signals.push('puppeteer');          score += 50; }
  if (win.Cypress)                                                            { signals.push('cypress');            score += 30; }
  if (win._selenium || win.__selenium_evaluate ||
      document.documentElement.getAttribute('webdriver'))                     { signals.push('selenium');           score += 40; }
  if (win.callPhantom || win._phantom)                                        { signals.push('phantomjs');          score += 50; }
  if (win.__nightmare)                                                        { signals.push('nightmare');          score += 50; }

  // User-agent anomalies
  const ua: string = nav.userAgent ?? '';
  if (!ua)                                { signals.push('no-ua');                   score += 25; }
  else if (ua.includes('HeadlessChrome')) { signals.push('headless-chrome-ua');      score += 50; }
  else if (ua.includes('PhantomJS'))      { signals.push('phantomjs-ua');            score += 50; }

  // Missing browser features
  if (!nav.plugins || nav.plugins.length === 0)      { signals.push('no-plugins');   score += 12; }
  if (!nav.languages || nav.languages.length === 0)  { signals.push('no-languages'); score += 10; }

  // Screen anomalies
  if (screen.width === 0 || screen.height === 0)            { signals.push('zero-screen');            score += 30; }
  else if (screen.width === 800 && screen.height === 600)   { signals.push('headless-default-screen'); score += 15; }

  // Canvas API
  try {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    if (!ctx) {
      signals.push('no-canvas-2d'); score += 15;
    } else {
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 1, 1);
      const px = ctx.getImageData(0, 0, 1, 1).data;
      if (px[0] !== 255 || px[3] !== 255) { signals.push('canvas-anomaly'); score += 10; }
    }
  } catch { signals.push('canvas-error'); score += 15; }

  // WebGL software renderer
  try {
    const gl = document.createElement('canvas').getContext('webgl') as WebGLRenderingContext | null;
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
        if (/SwiftShader|llvmpipe|Mesa|VMware/i.test(renderer)) {
          signals.push('software-renderer'); score += 20;
        }
      }
    }
  } catch { /* not conclusive */ }

  // AudioContext
  if (!(win.AudioContext || win.webkitAudioContext)) { signals.push('no-audio-ctx'); score += 8; }

  return { score: Math.min(score, 100), signals };
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 2 · Behavioral Analysis
// ─────────────────────────────────────────────────────────────────────────────

class BehaviorTracker {
  private moves = 0;
  private distance = 0;
  private lastX = 0;
  private lastY = 0;
  private keys = 0;
  private scrolls = 0;
  private clicks = 0;
  private startMs = Date.now();
  private running = false;

  private onMove = (e: MouseEvent) => {
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.distance += Math.sqrt(dx * dx + dy * dy);
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.moves++;
  };
  private onKey    = () => { this.keys++;    };
  private onScroll = () => { this.scrolls++; };
  private onClick  = () => { this.clicks++;  };

  start() {
    if (this.running || typeof window === 'undefined') return;
    this.running = true;
    document.addEventListener('mousemove', this.onMove,   { passive: true });
    document.addEventListener('keydown',   this.onKey,    { passive: true });
    document.addEventListener('scroll',    this.onScroll, { passive: true });
    document.addEventListener('click',     this.onClick,  { passive: true });
  }

  stop() {
    if (!this.running) return;
    document.removeEventListener('mousemove', this.onMove);
    document.removeEventListener('keydown',   this.onKey);
    document.removeEventListener('scroll',    this.onScroll);
    document.removeEventListener('click',     this.onClick);
    this.running = false;
  }

  /** 0 = bot-like · 100 = clearly human */
  humanScore(): number {
    let s = 0;
    if      (this.moves > 20) s += 30;
    else if (this.moves > 5)  s += 15;
    else if (this.moves > 0)  s += 5;

    if      (this.distance > 500) s += 20;
    else if (this.distance > 100) s += 10;

    if      (this.clicks > 3) s += 15;
    else if (this.clicks > 0) s += 8;

    if      (this.scrolls > 2) s += 10;
    else if (this.scrolls > 0) s += 5;

    if (this.keys > 3) s += 10;

    const ageMs = Date.now() - this.startMs;
    if      (ageMs > 15_000) s += 15;
    else if (ageMs > 5_000)  s += 8;

    return Math.min(s, 100);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 3 · Sliding-Window Rate Limiter
// ─────────────────────────────────────────────────────────────────────────────

class SlidingLimiter {
  private windows = new Map<string, number[]>();

  constructor(private windowMs: number, private max: number) {}

  check(key: string): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    const cut = now - this.windowMs;
    const ts  = (this.windows.get(key) ?? []).filter(t => t > cut);
    if (ts.length >= this.max) {
      return { allowed: false, retryAfterMs: ts[0] + this.windowMs - now };
    }
    ts.push(now);
    this.windows.set(key, ts);
    return { allowed: true, retryAfterMs: 0 };
  }

  reset(key: string) { this.windows.delete(key); }
}

const ACTION_WINDOWS: Record<string, { windowMs: number; max: number }> = {
  stake:    { windowMs:  60_000, max: 3 },
  unstake:  { windowMs:  60_000, max: 3 },
  claim:    { windowMs: 120_000, max: 2 },
  compound: { windowMs: 120_000, max: 2 },
  register: { windowMs: 300_000, max: 2 },
  connect:  { windowMs:  60_000, max: 8 },
  rpcRead:  { windowMs:  10_000, max: 30 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Layer 4 · Logic Abuse Guard
// ─────────────────────────────────────────────────────────────────────────────

class AbuseGuard {
  private log: { action: string; ts: number }[] = [];
  private fails: Record<string, number> = {};

  record(action: string) {
    const now = Date.now();
    this.log.push({ action, ts: now });
    this.log = this.log.filter(e => now - e.ts < 300_000);
  }

  recordFailure(action: string) {
    this.fails[action] = (this.fails[action] ?? 0) + 1;
  }

  isAbusive(): boolean {
    // >5 repeated failures on any single action
    for (const n of Object.values(this.fails)) {
      if (n >= 5) return true;
    }
    // claim↔compound rapid cycling (4+ alternations in last 6 actions)
    const tail = this.log.slice(-6).map(e => e.action);
    let alt = 0;
    for (let i = 1; i < tail.length; i++) {
      if (
        (tail[i-1] === 'claim' && tail[i] === 'compound') ||
        (tail[i-1] === 'compound' && tail[i] === 'claim')
      ) alt++;
    }
    return alt >= 4;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 5 · PoW Challenge  (SubtleCrypto SHA-256)
// ─────────────────────────────────────────────────────────────────────────────

export function makePowChallenge(difficulty = 14): PowChallenge {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const challenge = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return { challenge, difficulty };
}

export async function solvePow(
  pow: PowChallenge,
  onProgress?: (pct: number) => void,
): Promise<PowSolution> {
  const enc     = new TextEncoder();
  const maxIter = 4_000_000;
  for (let nonce = 0; nonce < maxIter; nonce++) {
    const buf  = await crypto.subtle.digest('SHA-256', enc.encode(`${pow.challenge}:${nonce}`));
    const view = new DataView(buf);
    if ((view.getUint32(0, false) >>> (32 - pow.difficulty)) === 0) {
      const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      return { nonce, hash };
    }
    if (onProgress && nonce % 20_000 === 0) onProgress(Math.min(95, (nonce / maxIter) * 100));
  }
  throw new Error('PoW: nonce space exhausted');
}

export async function verifyPow(pow: PowChallenge, sol: PowSolution): Promise<boolean> {
  const enc  = new TextEncoder();
  const buf  = await crypto.subtle.digest('SHA-256', enc.encode(`${pow.challenge}:${sol.nonce}`));
  const view = new DataView(buf);
  if ((view.getUint32(0, false) >>> (32 - pow.difficulty)) !== 0) return false;
  const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hash === sol.hash;
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 6 · Session Risk Engine
// ─────────────────────────────────────────────────────────────────────────────

/** Called by the singleton when a challenge is required — wired up by useBotGuard hook. */
let _onChallengeRequired: (() => void) | null = null;
export function setChallengeRequiredCallback(cb: (() => void) | null) {
  _onChallengeRequired = cb;
}

export class BotGuard {
  private fp       = runFingerprint();
  private behavior = new BehaviorTracker();
  private limiters = new Map(
    Object.entries(ACTION_WINDOWS).map(([k, cfg]) => [k, new SlidingLimiter(cfg.windowMs, cfg.max)])
  );
  private abuse    = new AbuseGuard();
  private _solved  = false;
  private _pow: PowChallenge | null = null;

  constructor() { this.behavior.start(); }

  // ── Assessment ──────────────────────────────────────────────────────────────

  assess(): BotAssessment {
    const fpScore  = this.fp.score;
    const humanS   = this.behavior.humanScore();
    const abusive  = this.abuse.isAbusive();

    let score = fpScore;
    if (humanS < 15) score += 20;
    else if (humanS < 30) score += 10;
    if (abusive) score += 25;
    score = Math.min(100, score);

    let riskLevel: RiskLevel;
    if (score >= 65 || fpScore >= 50)        riskLevel = 'blocked';
    else if (score >= 35 || abusive)         riskLevel = 'high';
    else if (score >= 15 || humanS < 15)     riskLevel = 'medium';
    else                                     riskLevel = 'low';

    const requiresChallenge =
      (riskLevel === 'medium' || riskLevel === 'high') && !this._solved;

    return {
      riskLevel,
      score,
      signals: this.fp.signals,
      requiresChallenge,
      blocked: riskLevel === 'blocked',
    };
  }

  // ── Action Gating ───────────────────────────────────────────────────────────

  canPerformAction(actionType: string): ActionResult {
    const { blocked, requiresChallenge, riskLevel } = this.assess();

    if (blocked) {
      return {
        allowed: false,
        reason: 'Automated activity detected. Please use a standard browser.',
      };
    }

    if (requiresChallenge) {
      _onChallengeRequired?.();
      return {
        allowed: false,
        requiresChallenge: true,
        reason: riskLevel === 'high'
          ? 'Suspicious session detected — please complete the security verification.'
          : 'Please complete the quick security check to continue.',
      };
    }

    const limiter = this.limiters.get(actionType);
    if (limiter) {
      const { allowed, retryAfterMs } = limiter.check(actionType);
      if (!allowed) {
        const secs = Math.ceil(retryAfterMs / 1000);
        return {
          allowed: false,
          reason: `Too many ${actionType} requests — please wait ${secs}s.`,
          retryAfterMs,
        };
      }
    }

    this.abuse.record(actionType);
    return { allowed: true };
  }

  recordFailure(actionType: string) { this.abuse.recordFailure(actionType); }

  // ── PoW ─────────────────────────────────────────────────────────────────────

  get challengeSolved() { return this._solved; }

  newChallenge(): PowChallenge {
    const { riskLevel } = this.assess();
    this._pow = makePowChallenge(riskLevel === 'high' ? 16 : 14);
    return this._pow;
  }

  async solveAndVerify(onProgress?: (pct: number) => void): Promise<boolean> {
    if (!this._pow) this._pow = this.newChallenge();
    try {
      const sol   = await solvePow(this._pow, onProgress);
      const valid = await verifyPow(this._pow, sol);
      if (valid) this._solved = true;
      return valid;
    } catch { return false; }
  }

  markSolved() { this._solved = true; }

  destroy() { this.behavior.stop(); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────────────────────

let _singleton: BotGuard | null = null;

export function getBotGuard(): BotGuard {
  if (typeof window === 'undefined') return new BotGuard();
  if (!_singleton) _singleton = new BotGuard();
  return _singleton;
}
