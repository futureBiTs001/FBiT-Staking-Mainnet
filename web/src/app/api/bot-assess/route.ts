/**
 * Layer 8 — Claude AI Bot Assessment Endpoint
 *
 * Called only for borderline sessions (TF.js ML probability 0.20 – 0.80)
 * where simple rules and the local classifier are uncertain.
 *
 * Claude receives the full session context and returns a structured risk
 * assessment with reasoning — giving the system explainable, nuanced
 * decisions that purely rule-based systems miss.
 *
 * Response is kept short (max_tokens 200) to stay fast and cheap.
 * Fails open: on any error the endpoint returns risk=low so that a
 * downstream API outage never locks out legitimate users.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime    = 'nodejs';
export const maxDuration = 10;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' });

// ── Simple in-process rate limiter (10 req / min per IP) ──────────────────────
const _rl = new Map<string, { count: number; reset: number }>();
function checkRateLimit(ip: string): boolean {
  const now  = Date.now();
  const slot = _rl.get(ip);
  if (!slot || now > slot.reset) {
    _rl.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (slot.count >= 10) return false;
  slot.count++;
  return true;
}

// Allowed origins — tighten if you have a fixed production domain
const ALLOWED_ORIGINS = (process.env.NEXT_PUBLIC_SITE_URL ?? '').split(',').map(s => s.trim()).filter(Boolean);

// ─────────────────────────────────────────────────────────────────────────────
// Request / response types
// ─────────────────────────────────────────────────────────────────────────────

interface AssessRequest {
  signals:       string[];
  fpScore:       number;   // 0–100
  humanScore:    number;   // 0–100
  mlProbability: number;   // 0–1
  behavior: {
    mouseMovements: number;
    mouseDistance:  number;
    clicks:         number;
    keystrokes:     number;
    scrolls:        number;
    sessionAgeMs:   number;
  };
  abusive: boolean;
}

interface AssessResponse {
  risk:       'low' | 'medium' | 'high' | 'blocked';
  confidence: number;   // 0–1
  reasoning:  string;
  flags:      string[];
}

const VALID_RISKS = new Set(['low', 'medium', 'high', 'blocked']);

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Rate limit ──────────────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json<AssessResponse>(failOpen(), { status: 429 });
  }

  // ── Origin check (skip when no allowed origins configured) ─────────────────
  if (ALLOWED_ORIGINS.length > 0) {
    const origin = req.headers.get('origin') ?? '';
    if (!ALLOWED_ORIGINS.some(o => origin === o || origin.endsWith(`.${o}`))) {
      return NextResponse.json<AssessResponse>(failOpen(), { status: 403 });
    }
  }

  try {
    const body = (await req.json()) as Partial<AssessRequest>;

    if (typeof body.fpScore !== 'number' || typeof body.humanScore !== 'number') {
      return NextResponse.json<AssessResponse>(failOpen(), { status: 400 });
    }

    const b   = body.behavior ?? { mouseMovements:0, mouseDistance:0, clicks:0, keystrokes:0, scrolls:0, sessionAgeMs:0 };
    const ageS = Math.round((b.sessionAgeMs ?? 0) / 1000);

    // Sanitize signals — strip newlines and any chars that could break prompt structure
    const safeSignals = (body.signals ?? [])
      .map(s => String(s).replace(/[\r\n\t=]/g, ' ').slice(0, 80))
      .slice(0, 20);

    const prompt = `You are a bot-detection classifier for FBiT, a DeFi staking platform. Analyze this browser session and classify it.

== Session Data ==
Fingerprint signals : ${safeSignals.join(', ') || 'none'}
Fingerprint score   : ${body.fpScore}/100  (higher = more bot-like)
Behavioral score    : ${body.humanScore}/100  (higher = more human-like)
ML bot probability  : ${((body.mlProbability ?? 0.5) * 100).toFixed(1)}%

Interaction events:
  Mouse movements : ${b.mouseMovements} (${b.mouseDistance}px total)
  Clicks          : ${b.clicks}
  Keystrokes      : ${b.keystrokes}
  Scroll events   : ${b.scrolls}
  Session age     : ${ageS}s
Abuse pattern     : ${body.abusive ? 'YES — rapid cycling detected' : 'no'}

== Task ==
Classify the risk level. Consider:
- webdriver / playwright / puppeteer signals are near-definitive bot markers.
- Zero mouse movement + zero scrolls for > 10 s is suspicious.
- Very short session age before a transaction attempt is suspicious.
- Missing plugins alone is weak signal on mobile or hardened browsers.
- Fail toward "low" when evidence is ambiguous — never block real users.

Respond with ONLY this JSON (no markdown, no explanation outside it):
{"risk":"low","confidence":0.0,"reasoning":"one sentence max 120 chars","flags":["signal"]}`;

    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 220,
      system:     'You are a precise bot-detection classifier. Output ONLY valid JSON matching the exact schema. Never wrap in markdown.',
      messages:   [{ role: 'user', content: prompt }],
    });

    const raw  = (message.content[0] as { type: string; text: string }).text.trim();
    // Strip accidental markdown fences
    const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(json) as AssessResponse;

    if (!VALID_RISKS.has(parsed.risk) || typeof parsed.confidence !== 'number') {
      throw new Error('Invalid Claude response schema');
    }

    // Clamp confidence
    parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));

    return NextResponse.json<AssessResponse>(parsed);
  } catch (err) {
    console.error('[bot-assess]', err instanceof Error ? err.message : err);
    // Fail open — never block users due to API errors
    return NextResponse.json<AssessResponse>(failOpen());
  }
}

function failOpen(): AssessResponse {
  return { risk: 'low', confidence: 0, reasoning: 'Assessment unavailable — defaulting to safe.', flags: [] };
}
