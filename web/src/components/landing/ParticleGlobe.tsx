'use client';

import React, { useEffect, useRef } from 'react';

interface Point3D { x: number; y: number; z: number; size: number; hue: 'brand' | 'cyan' | 'white' }

// Evenly distributes `count` points across a sphere of radius `r` (Fibonacci sphere).
function buildSpherePoints(count: number, r: number): Point3D[] {
  const points: Point3D[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = golden * i;
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;
    const roll = Math.random();
    points.push({
      x: x * r, y: y * r, z: z * r,
      size: 0.9 + Math.random() * 1.1,
      hue: roll < 0.72 ? 'white' : roll < 0.88 ? 'brand' : 'cyan',
    });
  }
  return points;
}

// A tilted ring of orbiting points — mirrors the "streak" bands in the reference animation.
function buildRingPoints(count: number, r: number, tiltX: number, tiltZ: number): Point3D[] {
  const points: Point3D[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x0 = Math.cos(a) * r;
    const z0 = Math.sin(a) * r;
    // apply tilt (rotate around X then Z)
    const y1 = x0 * Math.sin(tiltX);
    const x1 = x0 * Math.cos(tiltX);
    const x2 = x1 * Math.cos(tiltZ) - y1 * Math.sin(tiltZ);
    const y2 = x1 * Math.sin(tiltZ) + y1 * Math.cos(tiltZ);
    points.push({ x: x2, y: y2, z: z0, size: 0.5 + Math.random() * 0.5, hue: 'brand' });
  }
  return points;
}

const COLORS: Record<Point3D['hue'], string> = {
  white: '241, 245, 249',
  brand: '0, 230, 118',
  cyan:  '6, 182, 212',
};

export default function ParticleGlobe({ size = 640 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const radius = size * 0.3;
    const sphere = buildSpherePoints(2200, radius);
    const rings = [
      ...buildRingPoints(180, radius * 1.3, 0.9, 0.3),
      ...buildRingPoints(160, radius * 1.5, 1.1, -0.4),
      ...buildRingPoints(140, radius * 1.15, 0.4, 1.1),
    ];
    const allPoints = [...sphere, ...rings];

    let angleY = 0;
    let angleX = 0.15;
    let raf = 0;
    const focal = radius * 3.2;
    const cx = size / 2;
    const cy = size / 2;

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX), sinX = Math.sin(angleX);

      // Rotate + project, then depth-sort so nearer points draw last (on top).
      const projected = allPoints.map((p) => {
        // rotate around Y
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;
        // rotate around X
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        const scale = focal / (focal + z2);
        return {
          sx: cx + x1 * scale,
          sy: cy + y2 * scale,
          scale,
          size: p.size * scale,
          hue: p.hue,
          z: z2,
        };
      }).sort((a, b) => a.z - b.z);

      for (const p of projected) {
        const alpha = Math.max(0.16, Math.min(1, (p.scale - 0.45) * 1.7));
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, Math.max(0.6, p.size), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${COLORS[p.hue]}, ${alpha})`;
        ctx.fill();
      }

      if (!reduceMotion) {
        angleY += 0.0022;
        angleX = 0.15 + Math.sin(angleY * 0.6) * 0.08;
        raf = requestAnimationFrame(render);
      }
    };

    render();
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="pointer-events-none select-none"
      aria-hidden="true"
    />
  );
}
