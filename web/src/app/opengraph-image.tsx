import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FutureBit Staking — Earn up to 300% APY on Solana';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #060d19 0%, #0d1f0d 50%, #060d19 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Background glow */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,230,118,0.12) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Logo circle */}
        <div style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #00E676, #00a855)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 52,
          fontWeight: 900,
          color: '#060d19',
          marginBottom: 28,
          boxShadow: '0 0 60px rgba(0,230,118,0.4)',
        }}>
          F
        </div>

        {/* Title */}
        <div style={{
          fontSize: 64,
          fontWeight: 900,
          color: '#ffffff',
          textAlign: 'center',
          lineHeight: 1.1,
          marginBottom: 16,
          display: 'flex',
        }}>
          FBiT&nbsp;<span style={{ color: '#00E676' }}>Staking</span>
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 28,
          color: 'rgba(255,255,255,0.65)',
          textAlign: 'center',
          marginBottom: 40,
          display: 'flex',
        }}>
          Earn up to 300% APY on Solana
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex',
          gap: 24,
        }}>
          {[
            { label: 'APY',      value: '247%',   color: '#00E676' },
            { label: 'Networks', value: '2 Chains', color: '#06b6d4' },
            { label: 'Referral', value: '10 Levels', color: '#a855f7' },
            { label: 'Fee',      value: '1% Only',  color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 16,
              padding: '16px 28px',
            }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: s.color, display: 'flex' }}>{s.value}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4, display: 'flex' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* URL badge */}
        <div style={{
          position: 'absolute',
          bottom: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'rgba(255,255,255,0.35)',
          fontSize: 18,
        }}>
          futurebit.in
        </div>
      </div>
    ),
    { ...size }
  );
}
