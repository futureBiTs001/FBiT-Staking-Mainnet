'use client';

import React from 'react';

export default function Logo3D({ size = 200 }: { size?: number }) {
  const depth = Math.round(size * 0.055); // coin thickness

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size, perspective: '700px' }}
    >
      {/* Glow behind coin */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(0,230,118,0.28) 0%, rgba(168,85,247,0.14) 55%, transparent 80%)',
          filter: 'blur(18px)',
          animation: 'coinGlow 3s ease-in-out infinite',
          transform: 'scale(1.15)',
        }}
      />

      {/* Coin wrapper — spins */}
      <div
        style={{
          width: size,
          height: size,
          position: 'relative',
          transformStyle: 'preserve-3d',
          animation: 'coinSpin 6s linear infinite',
        }}
      >

        {/* ── COIN EDGE (many thin slices to simulate depth) ── */}
        {Array.from({ length: depth }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: `linear-gradient(135deg,
                rgba(0,200,100,${0.55 - i * 0.01}) 0%,
                rgba(0,160,70,${0.45 - i * 0.01})  50%,
                rgba(0,120,50,${0.4  - i * 0.01})  100%)`,
              transform: `translateZ(${-i}px)`,
              boxShadow: i === 0 ? 'none' : undefined,
            }}
          />
        ))}

        {/* ── COIN BACK FACE ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #006630 0%, #004422 60%, #003318 100%)',
            transform: `translateZ(-${depth}px) rotateY(180deg)`,
            backfaceVisibility: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Back face pattern */}
          <svg viewBox="0 0 200 200" width={size * 0.7} height={size * 0.7}>
            <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(0,230,118,0.25)" strokeWidth="1.5"/>
            <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(0,230,118,0.18)" strokeWidth="1"/>
            <circle cx="100" cy="100" r="50" fill="none" stroke="rgba(0,230,118,0.15)" strokeWidth="1"/>
            <text x="100" y="108" textAnchor="middle" fontSize="22" fontWeight="900"
              fontFamily="Outfit,sans-serif" fill="rgba(0,230,118,0.5)" letterSpacing="2">
              FBIT
            </text>
          </svg>
        </div>

        {/* ── COIN FRONT FACE ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            transform: 'translateZ(0px)',
            backfaceVisibility: 'hidden',
            overflow: 'hidden',
            background: 'linear-gradient(145deg, #1a1a2e 0%, #0f0f1f 100%)',
            boxShadow: '0 0 0 3px rgba(0,230,118,0.55), 0 0 0 5px rgba(0,180,80,0.2)',
          }}
        >
          {/* Front face base gradient */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background:
                'radial-gradient(ellipse at 38% 30%, rgba(255,255,255,0.08) 0%, transparent 65%)',
            }}
          />

          {/* SVG Logo on front */}
          <svg
            viewBox="0 0 500 500"
            width={size}
            height={size}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ position: 'absolute', inset: 0 }}
          >
            {/* Outer coin rim */}
            <circle cx="250" cy="250" r="238"
              fill="none"
              stroke="url(#rimGrad)"
              strokeWidth="8"/>

            {/* Inner rim line */}
            <circle cx="250" cy="250" r="218"
              fill="none"
              stroke="rgba(0,230,118,0.18)"
              strokeWidth="1.5"/>

            {/* Scattered dot squares */}
            <rect x="240" y="52"  width="10" height="10" rx="2" fill="rgba(255,255,255,0.35)"/>
            <rect x="85"  y="175" width="10" height="10" rx="2" fill="rgba(255,255,255,0.35)"/>
            <rect x="405" y="215" width="14" height="14" rx="2" fill="rgba(255,255,255,0.35)"/>
            <rect x="345" y="295" width="12" height="12" rx="2" fill="rgba(255,255,255,0.35)"/>
            <rect x="400" y="360" width="10" height="10" rx="2" fill="rgba(255,255,255,0.35)"/>
            <rect x="155" y="425" width="10" height="10" rx="2" fill="rgba(255,255,255,0.35)"/>

            {/* Connection lines */}
            <line x1="185" y1="168" x2="185" y2="238" stroke="rgba(0,230,118,0.5)" strokeWidth="2"/>
            <line x1="255" y1="275" x2="192" y2="343" stroke="rgba(0,230,118,0.5)" strokeWidth="2"/>

            {/* Pink pill — top */}
            <rect x="110" y="125" width="285" height="72" rx="36"
              fill="url(#pinkGlass)"
              stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
            <circle cx="185" cy="161" r="12"
              fill="rgba(255,255,255,0.12)"
              stroke="rgba(255,255,255,0.65)" strokeWidth="2.5"/>
            <circle cx="185" cy="161" r="4" fill="rgba(255,255,255,0.9)"/>

            {/* Purple pill — middle */}
            <rect x="130" y="226" width="248" height="66" rx="33"
              fill="url(#purpleGlass)"
              stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
            <circle cx="185" cy="259" r="11"
              fill="rgba(255,255,255,0.1)"
              stroke="rgba(255,255,255,0.6)" strokeWidth="2.5"/>
            <circle cx="185" cy="259" r="4" fill="rgba(255,255,255,0.85)"/>
            <circle cx="255" cy="259" r="11"
              fill="rgba(255,255,255,0.1)"
              stroke="rgba(255,255,255,0.6)" strokeWidth="2.5"/>
            <circle cx="255" cy="259" r="4" fill="rgba(255,255,255,0.85)"/>

            {/* Green circle — bottom left */}
            <circle cx="188" cy="355" r="44" fill="url(#greenGlass)"
              stroke="rgba(255,255,255,0.35)" strokeWidth="2"/>
            <circle cx="188" cy="355" r="14"
              fill="rgba(255,255,255,0.12)"
              stroke="rgba(255,255,255,0.65)" strokeWidth="2.5"/>
            <circle cx="188" cy="355" r="5" fill="rgba(255,255,255,0.95)"/>

            {/* "Bit." text */}
            <text
              x="244" y="373"
              fontFamily="'Outfit','Arial Black',sans-serif"
              fontWeight="900"
              fontSize="60"
              fill="rgba(255,255,255,0.95)"
              letterSpacing="-2"
            >Bit.</text>

            {/* Highlight sheen on coin face */}
            <ellipse cx="200" cy="180" rx="120" ry="60"
              fill="url(#sheen)"
              style={{ mixBlendMode: 'overlay' }}/>

            <defs>
              <linearGradient id="rimGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"   stopColor="rgba(0,230,118,0.9)"/>
                <stop offset="30%"  stopColor="rgba(0,255,140,0.6)"/>
                <stop offset="60%"  stopColor="rgba(0,180,80,0.7)"/>
                <stop offset="100%" stopColor="rgba(0,230,118,0.9)"/>
              </linearGradient>
              <linearGradient id="pinkGlass" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"   stopColor="rgba(216,120,255,0.82)"/>
                <stop offset="100%" stopColor="rgba(168,85,247,0.65)"/>
              </linearGradient>
              <linearGradient id="purpleGlass" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"   stopColor="rgba(120,90,255,0.82)"/>
                <stop offset="100%" stopColor="rgba(90,60,220,0.65)"/>
              </linearGradient>
              <radialGradient id="greenGlass" cx="38%" cy="35%">
                <stop offset="0%"   stopColor="rgba(0,230,118,0.95)"/>
                <stop offset="100%" stopColor="rgba(0,160,70,0.8)"/>
              </radialGradient>
              <radialGradient id="sheen" cx="35%" cy="30%">
                <stop offset="0%"   stopColor="rgba(255,255,255,0.18)"/>
                <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
              </radialGradient>
            </defs>
          </svg>
        </div>

        {/* Glass sheen overlay on front */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 45%, transparent 60%)',
            transform: 'translateZ(1px)',
            pointerEvents: 'none',
          }}
        />
      </div>

      <style>{`
        @keyframes coinSpin {
          0%   { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        @keyframes coinGlow {
          0%,100% { opacity:0.7; transform:scale(1.1); }
          50%      { opacity:1;   transform:scale(1.2); }
        }
      `}</style>
    </div>
  );
}
