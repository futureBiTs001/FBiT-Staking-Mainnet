'use client';

import React from 'react';

export default function Logo3D({ size = 200 }: { size?: number }) {
  const r = size / 2;
  const depth = Math.round(size * 0.08); // coin thickness

  return (
    <div
      style={{
        width: size,
        height: size,
        perspective: '600px',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Glow underneath */}
      <div style={{
        position: 'absolute',
        inset: '10%',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,230,118,0.35) 0%, rgba(0,180,80,0.15) 60%, transparent 100%)',
        filter: 'blur(20px)',
        animation: 'glowPulse 3s ease-in-out infinite',
        zIndex: 0,
      }} />

      {/* Coin wrapper */}
      <div style={{
        width: size,
        height: size,
        position: 'relative',
        transformStyle: 'preserve-3d',
        animation: 'coinFlip 7s linear infinite',
        zIndex: 1,
      }}>

        {/* ── COIN EDGE slices ── */}
        {Array.from({ length: depth }).map((_, i) => {
          const t = i / depth;
          // color: bright green at center, darker at edges
          const g = Math.round(160 + 60 * Math.sin(Math.PI * t));
          return (
            <div key={i} style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: `radial-gradient(circle at 30% 30%,
                rgb(0,${g + 40},60) 0%,
                rgb(0,${g},40) 50%,
                rgb(0,${g - 30},20) 100%)`,
              transform: `translateZ(${-(i + 1)}px)`,
            }} />
          );
        })}

        {/* ── COIN BACK FACE ── */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          transform: `translateZ(-${depth}px) rotateY(180deg)`,
          backfaceVisibility: 'hidden',
          background: 'radial-gradient(circle at 40% 35%, #1a5c30 0%, #0d3d1e 50%, #071f0f 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {/* Back face engraved rings */}
          <svg viewBox="0 0 200 200" width={size} height={size}>
            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(0,230,118,0.20)" strokeWidth="1.5"/>
            <circle cx="100" cy="100" r="75" fill="none" stroke="rgba(0,230,118,0.15)" strokeWidth="1"/>
            <circle cx="100" cy="100" r="58" fill="none" stroke="rgba(0,230,118,0.10)" strokeWidth="1"/>
            {/* FBiT text on back */}
            <text x="100" y="95" textAnchor="middle" fontFamily="Outfit,sans-serif"
              fontWeight="900" fontSize="18" fill="rgba(0,230,118,0.55)" letterSpacing="4">
              FBIT
            </text>
            <text x="100" y="115" textAnchor="middle" fontFamily="Outfit,sans-serif"
              fontWeight="400" fontSize="8" fill="rgba(0,230,118,0.30)" letterSpacing="2">
              FUTUREBIT TOKEN
            </text>
          </svg>
        </div>

        {/* ── COIN FRONT FACE ── */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          transform: 'translateZ(0px)',
          backfaceVisibility: 'hidden',
          overflow: 'hidden',
          background: 'radial-gradient(circle at 38% 32%, #1e2a1e 0%, #111811 45%, #080e08 100%)',
        }}>

          {/* Metallic highlight arc top-left */}
          <div style={{
            position: 'absolute',
            top: '-10%',
            left: '-10%',
            width: '70%',
            height: '70%',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 40% 40%, rgba(0,230,118,0.12) 0%, transparent 70%)',
          }} />

          {/* Logo SVG */}
          <svg
            viewBox="0 0 500 500"
            width={size}
            height={size}
            style={{ position: 'absolute', inset: 0 }}
          >
            <defs>
              {/* Outer rim gradient */}
              <linearGradient id="rimG" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#00ff88"/>
                <stop offset="25%"  stopColor="#00cc66"/>
                <stop offset="50%"  stopColor="#009944"/>
                <stop offset="75%"  stopColor="#00cc66"/>
                <stop offset="100%" stopColor="#00ff88"/>
              </linearGradient>

              {/* Inner rim */}
              <linearGradient id="rimInner" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="rgba(0,200,100,0.4)"/>
                <stop offset="100%" stopColor="rgba(0,100,50,0.2)"/>
              </linearGradient>

              {/* Pink pill */}
              <linearGradient id="pinkG" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#e879f9"/>
                <stop offset="100%" stopColor="#a855f7"/>
              </linearGradient>

              {/* Purple pill */}
              <linearGradient id="purpG" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#818cf8"/>
                <stop offset="100%" stopColor="#4f46e5"/>
              </linearGradient>

              {/* Green circle */}
              <radialGradient id="greenG" cx="38%" cy="35%">
                <stop offset="0%"   stopColor="#00ff88"/>
                <stop offset="100%" stopColor="#00a855"/>
              </radialGradient>

              {/* Shine on pills */}
              <linearGradient id="shineG" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor="rgba(255,255,255,0.22)"/>
                <stop offset="50%"  stopColor="rgba(255,255,255,0.04)"/>
                <stop offset="100%" stopColor="rgba(0,0,0,0.1)"/>
              </linearGradient>
            </defs>

            {/* Outer coin rim — thick metallic ring */}
            <circle cx="250" cy="250" r="242" fill="none" stroke="url(#rimG)"     strokeWidth="12"/>
            <circle cx="250" cy="250" r="228" fill="none" stroke="url(#rimInner)" strokeWidth="2"/>

            {/* Engraved tick marks on rim */}
            {Array.from({ length: 36 }).map((_, i) => {
              const angle = (i * 10 * Math.PI) / 180;
              const x1 = 250 + 233 * Math.cos(angle);
              const y1 = 250 + 233 * Math.sin(angle);
              const x2 = 250 + 223 * Math.cos(angle);
              const y2 = 250 + 223 * Math.sin(angle);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(0,180,80,0.35)" strokeWidth="1.5"/>;
            })}

            {/* Dot squares */}
            <rect x="243" y="48"  width="14" height="14" rx="2" fill="rgba(0,230,118,0.45)"/>
            <rect x="78"  y="172" width="12" height="12" rx="2" fill="rgba(0,230,118,0.35)"/>
            <rect x="408" y="212" width="16" height="16" rx="2" fill="rgba(0,230,118,0.35)"/>
            <rect x="348" y="298" width="14" height="14" rx="2" fill="rgba(0,230,118,0.30)"/>
            <rect x="402" y="358" width="12" height="12" rx="2" fill="rgba(0,230,118,0.30)"/>
            <rect x="150" y="422" width="12" height="12" rx="2" fill="rgba(0,230,118,0.30)"/>

            {/* Connection lines */}
            <line x1="183" y1="165" x2="183" y2="235"
              stroke="rgba(0,230,118,0.6)" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="253" y1="275" x2="190" y2="342"
              stroke="rgba(0,230,118,0.6)" strokeWidth="2.5" strokeLinecap="round"/>

            {/* ── Pink pill ── */}
            <rect x="108" y="122" width="290" height="76" rx="38" fill="url(#pinkG)"/>
            {/* shine */}
            <rect x="108" y="122" width="290" height="38" rx="38" fill="url(#shineG)" opacity="0.6"/>
            {/* node dot */}
            <circle cx="183" cy="160" r="14" fill="#1e0a2e" stroke="#e879f9" strokeWidth="3"/>
            <circle cx="183" cy="160" r="5"  fill="#f0a8ff"/>

            {/* ── Purple pill ── */}
            <rect x="128" y="224" width="252" height="68" rx="34" fill="url(#purpG)"/>
            {/* shine */}
            <rect x="128" y="224" width="252" height="34" rx="34" fill="url(#shineG)" opacity="0.5"/>
            {/* node dots */}
            <circle cx="183" cy="258" r="12" fill="#0d0a2e" stroke="#818cf8" strokeWidth="3"/>
            <circle cx="183" cy="258" r="4.5" fill="#c7d2fe"/>
            <circle cx="253" cy="258" r="12" fill="#0d0a2e" stroke="#818cf8" strokeWidth="3"/>
            <circle cx="253" cy="258" r="4.5" fill="#c7d2fe"/>

            {/* ── Green circle ── */}
            <circle cx="188" cy="356" r="46" fill="url(#greenG)"/>
            {/* shine arc */}
            <ellipse cx="178" cy="342" rx="24" ry="14" fill="rgba(255,255,255,0.18)"/>
            {/* target rings */}
            <circle cx="188" cy="356" r="32" fill="none" stroke="rgba(0,60,30,0.45)" strokeWidth="1.5"/>
            <circle cx="188" cy="356" r="16" fill="#0a2a14" stroke="rgba(0,230,118,0.6)" strokeWidth="3"/>
            <circle cx="188" cy="356" r="6"  fill="#00ff88"/>

            {/* ── "Bit." text ── */}
            <text
              x="248" y="378"
              fontFamily="'Outfit','Arial Black',sans-serif"
              fontWeight="900"
              fontSize="64"
              fill="#ffffff"
              letterSpacing="-2"
            >Bit.</text>

          </svg>

          {/* Top-left metallic sheen sweep */}
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 40%, transparent 60%)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* ── Front rim ring (z=0) — visible edge on front ── */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          boxShadow: 'inset 0 0 0 6px rgba(0,220,100,0.7), inset 0 0 0 9px rgba(0,120,50,0.3)',
          transform: 'translateZ(0.5px)',
          pointerEvents: 'none',
        }} />

      </div>

      <style>{`
        @keyframes coinFlip {
          0%   { transform: rotateY(0deg)   rotateX(8deg); }
          50%  { transform: rotateY(180deg) rotateX(-4deg); }
          100% { transform: rotateY(360deg) rotateX(8deg); }
        }
        @keyframes glowPulse {
          0%,100% { opacity: 0.6; transform: scale(1.0); }
          50%     { opacity: 1.0; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
