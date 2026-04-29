import { NextRequest, NextResponse } from 'next/server';

const RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana',
  'https://api.mainnet-beta.solana.com',
];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const owner = searchParams.get('owner');
  const mint  = searchParams.get('mint');

  if (!owner || !mint) {
    return NextResponse.json({ error: 'Missing owner or mint' }, { status: 400 });
  }

  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'getTokenAccountsByOwner',
    params: [owner, { mint }, { encoding: 'jsonParsed' }],
  });

  for (const rpc of RPC_ENDPOINTS) {
    try {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!res.ok) continue;
      const json = await res.json();
      const accounts: any[] = json?.result?.value ?? [];
      const balance = accounts.reduce((sum: number, acct: any) => {
        const ui: number = acct?.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0;
        return sum + ui;
      }, 0);
      return NextResponse.json({ balance });
    } catch {
      // try next RPC
    }
  }

  return NextResponse.json({ balance: 0 });
}
