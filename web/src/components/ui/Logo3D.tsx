'use client';

import React from 'react';

export default function Logo3D({ size = 180 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size, perspective: '800px' }}
    >
      {/* Outer glow ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(0,230,118,0.08) 60%, transparent 80%)',
          filter: 'blur(12px)',
          animation: 'pulse 3s ease-in-out infinite',
        }}
      />

      {/* 3D rotating glass logo */}
      <div
        style={{
          width:  size,
          height: size,
          transformStyle: 'preserve-3d',
          animation: 'spin3d 8s linear infinite',
        }}
      >
        {/* Glass circle container */}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '3px solid rgba(255,255,255,0.22)',
            boxShadow: '0 8px 32px rgba(168,85,247,0.25), 0 0 60px rgba(0,230,118,0.12), inset 0 1px 0 rgba(255,255,255,0.3)',
            transform: 'translateZ(0px)',
          }}
        >
          <svg
            viewBox="0 0 500 500"
            width={size * 0.82}
            height={size * 0.82}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Scattered dot squares */}
            <rect x="220" y="52"  width="10" height="10" rx="2" fill="rgba(255,255,255,0.5)"/>
            <rect x="75"  y="180" width="10" height="10" rx="2" fill="rgba(255,255,255,0.5)"/>
            <rect x="415" y="220" width="14" height="14" rx="2" fill="rgba(255,255,255,0.5)"/>
            <rect x="340" y="300" width="12" height="12" rx="2" fill="rgba(255,255,255,0.5)"/>
            <rect x="400" y="360" width="10" height="10" rx="2" fill="rgba(255,255,255,0.5)"/>
            <rect x="150" y="420" width="10" height="10" rx="2" fill="rgba(255,255,255,0.5)"/>
            <rect x="90"  y="350" width="8"  height="8"  rx="2" fill="rgba(255,255,255,0.4)"/>

            {/* Connection lines */}
            <line x1="175" y1="168" x2="175" y2="240" stroke="rgba(255,255,255,0.55)" strokeWidth="2"/>
            <line x1="245" y1="278" x2="185" y2="345" stroke="rgba(255,255,255,0.55)" strokeWidth="2"/>

            {/* Pink pill — top */}
            <rect x="105" y="125" width="290" height="74" rx="37" fill="url(#pinkGlass)"/>
            <rect x="105" y="125" width="290" height="74" rx="37" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
            {/* Circle on pink pill */}
            <circle cx="175" cy="162" r="12" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5"/>
            <circle cx="175" cy="162" r="4"  fill="rgba(255,255,255,0.9)"/>

            {/* Purple pill — middle */}
            <rect x="125" y="228" width="250" height="68" rx="34" fill="url(#purpleGlass)"/>
            <rect x="125" y="228" width="250" height="68" rx="34" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
            {/* Circle on purple pill (left) */}
            <circle cx="175" cy="262" r="11" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.65)" strokeWidth="2.5"/>
            <circle cx="175" cy="262" r="4"  fill="rgba(255,255,255,0.85)"/>
            {/* Circle on purple pill (right) */}
            <circle cx="245" cy="262" r="11" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.65)" strokeWidth="2.5"/>
            <circle cx="245" cy="262" r="4"  fill="rgba(255,255,255,0.85)"/>

            {/* Green circle — bottom left */}
            <circle cx="185" cy="358" r="45" fill="url(#greenGlass)"/>
            <circle cx="185" cy="358" r="45" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
            <circle cx="185" cy="358" r="14" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5"/>
            <circle cx="185" cy="358" r="5"  fill="rgba(255,255,255,0.95)"/>

            {/* "Bit." text */}
            <text
              x="242" y="375"
              fontFamily="'Outfit', 'Arial Black', sans-serif"
              fontWeight="900"
              fontSize="62"
              fill="rgba(255,255,255,0.95)"
              letterSpacing="-2"
            >
              Bit.
            </text>

            {/* Gradients */}
            <defs>
              <linearGradient id="pinkGlass" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"   stopColor="rgba(216,120,255,0.75)"/>
                <stop offset="100%" stopColor="rgba(168,85,247,0.55)"/>
              </linearGradient>
              <linearGradient id="purpleGlass" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"   stopColor="rgba(120,90,255,0.75)"/>
                <stop offset="100%" stopColor="rgba(90,60,220,0.55)"/>
              </linearGradient>
              <radialGradient id="greenGlass" cx="40%" cy="35%">
                <stop offset="0%"   stopColor="rgba(0,230,118,0.9)"/>
                <stop offset="100%" stopColor="rgba(0,180,80,0.7)"/>
              </radialGradient>
            </defs>
          </svg>
        </div>

        {/* Sheen / highlight layer */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 50%)',
            transform: 'translateZ(2px)',
          }}
        />
      </div>

      {/* CSS keyframes */}
      <style>{`
        @keyframes spin3d {
          0%   { transform: rotateY(0deg)   rotateX(8deg); }
          25%  { transform: rotateY(90deg)  rotateX(-4deg); }
          50%  { transform: rotateY(180deg) rotateX(8deg); }
          75%  { transform: rotateY(270deg) rotateX(-4deg); }
          100% { transform: rotateY(360deg) rotateX(8deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
