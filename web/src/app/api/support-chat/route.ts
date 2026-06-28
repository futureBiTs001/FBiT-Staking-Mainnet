import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime    = 'nodejs';
export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' });

const SYSTEM_PROMPT = `You are the official FutureBit (FBiT) Staking Platform support assistant.
You help users with questions about staking, referrals, rewards, and the platform.

Key platform facts:
- Platform: FutureBit Staking (stake.futurebit.in)
- Networks: Solana Mainnet + Polygon Mainnet (multi-chain)
- Solana Program ID: 8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp
- Polygon Contract: 0xb86DA67406DaD482428704c14AdA269E9653FDca
- Token (Solana): FBiT — CuubBzUTnQ4H2D2fHJCVWGEUEod2fJzq4nAPwfx8UGTu
- Token (Polygon): WFBIT — 0xa31b5A95268CAd709e6691Ec2F2F107A3F36D945

Staking details:
- Current APY: ~247% (dynamic PoS — changes with total staked)
- APY formula: annual_emission / total_staked × 10,000 (clamped 10%-300%)
- Annual emission: 10,000,000 FBiT/year
- Reserve: ~213.8M FBiT (~21 year runway)
- Min stake: 1 FBiT, Max: 500M FBiT per user
- Lock period: 30 days
- Claim interval: every 6 hours (4x per day)
- Platform fee: 1% on stake/unstake/claim/compound
- Burn: 10% of every reward is permanently burned

Referral system (10 levels):
- Level 1: 0.25%, Level 2: 0.5%, Level 3: 1.25%, Level 4: 1.5%
- Level 5: 1.75%, Level 6: 2%, Level 7: 2.25%, Level 8: 2.5%
- Level 9: 2.75%, Level 10: 3%
- Total up to 15.75% from all levels

Team Target Bonus (10 tiers based on team's total staked):
- Tier 1: 250K FBiT → 2%, ... Tier 10: 1B FBiT → 10%

Wallets supported: Phantom (Solana), MetaMask/any EVM wallet (Polygon)

Answer in the same language the user writes in. Be helpful, concise, and accurate.
If you don't know something specific, say so honestly. Never make up contract addresses or APY numbers.
Keep responses under 200 words unless a detailed explanation is needed.`;

// Rate limiter: 20 req/min per IP
const _rl = new Map<string, { count: number; reset: number }>();
function checkRateLimit(ip: string): boolean {
  const now  = Date.now();
  const slot = _rl.get(ip);
  if (!slot || now > slot.reset) { _rl.set(ip, { count: 1, reset: now + 60_000 }); return true; }
  if (slot.count >= 20) return false;
  slot.count++; return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait a minute.' }, { status: 429 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI service not configured.' }, { status: 503 });
  }

  let messages: { role: 'user' | 'assistant'; content: string }[];
  try {
    const body = await req.json();
    messages   = body.messages ?? [];
    if (!Array.isArray(messages) || messages.length === 0) throw new Error('No messages');
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  try {
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system:     SYSTEM_PROMPT,
      messages,
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ reply: text });
  } catch (err: any) {
    console.error('Support chat error:', err.message);
    return NextResponse.json({ error: 'AI service temporarily unavailable.' }, { status: 503 });
  }
}
