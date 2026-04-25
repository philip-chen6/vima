'use client';

import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
}

export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(250, 204, 21, 0.06)',
}: SpotlightCardProps) {
  const [position, setPosition] = useState({ x: 50, y: 50 });

  const overlayStyle: CSSProperties = {
    background: `radial-gradient(circle at ${position.x}% ${position.y}%, ${spotlightColor} 0%, transparent 45%)`,
  };

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-white/[0.06] bg-neutral-900/70 ${className}`}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPosition({
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        });
      }}
    >
      <div className="pointer-events-none absolute inset-0 transition-opacity duration-200" style={overlayStyle} />
      <div className="relative z-10 flex flex-col h-full">{children}</div>
    </div>
  );
}
