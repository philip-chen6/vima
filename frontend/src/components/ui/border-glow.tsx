'use client';

import type { CSSProperties, ReactNode } from 'react';

interface BorderGlowProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
}

export default function BorderGlow({
  children,
  className = '',
  glowColor = '250 204 21',
  borderRadius = 8,
  glowRadius = 80,
  glowIntensity = 0.15,
}: BorderGlowProps) {
  const style: CSSProperties = {
    borderRadius,
    boxShadow: `0 0 ${glowRadius}px rgb(${glowColor} / ${glowIntensity})`,
  };

  return (
    <div className={`relative ${className}`} style={style}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius,
          padding: 1,
          background: `linear-gradient(180deg, rgb(${glowColor} / 0.28), rgb(${glowColor} / 0.04))`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      <div className="relative z-10" style={{ borderRadius }}>
        {children}
      </div>
    </div>
  );
}
