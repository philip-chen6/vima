'use client';

import { useEffect, useState } from 'react';
import DecryptedText from '@/src/components/ui/decrypted-text';

interface HeaderProps {
  connected: boolean;
  lastUpdated: Date | null;
}

export default function Header({ connected }: HeaderProps) {
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short',
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-neutral-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center gap-3">
        {/* Wrench icon */}
        <div className="flex items-center justify-center w-8 h-8 rounded bg-yellow-400/10 border border-yellow-400/20">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-[0.16em] text-white leading-none">
            <DecryptedText
              text="vima"
              speed={40}
              maxIterations={12}
              sequential
              characters="abcdefghijklmnopqrstuvwxyz"
            />
          </h1>
          <span className="text-[10px] tracking-[0.08em] text-neutral-500">
            construction intelligence index
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <div className="hidden sm:flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]'}`}
            style={{ animation: connected ? 'pulse 2s infinite' : 'none' }} />
          <span className="text-neutral-500 tracking-wider">
            {connected ? 'connected' : 'offline'}
          </span>
        </div>
        <span className="text-neutral-600 font-mono tracking-wider">{clock}</span>
      </div>
    </header>
  );
}
