'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useInView } from 'motion/react';

interface DecryptedTextProps {
  text: string;
  className?: string;
  characters?: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: 'start' | 'end';
  animateOn?: 'view' | 'mount';
}

function randomChar(characters: string): string {
  return characters[Math.floor(Math.random() * characters.length)] ?? 'X';
}

export default function DecryptedText({
  text,
  className = '',
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  speed = 30,
  maxIterations = 8,
  sequential = false,
  revealDirection = 'start',
  animateOn = 'mount',
}: DecryptedTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -30px 0px' });
  const [display, setDisplay] = useState(animateOn === 'mount' ? '' : text);

  const shouldAnimate = animateOn === 'mount' ? true : inView;
  const chars = useMemo(() => Array.from(text), [text]);

  useEffect(() => {
    if (!shouldAnimate) return;

    let iteration = 0;
    const totalSteps = sequential ? chars.length + maxIterations : maxIterations;

    const interval = window.setInterval(() => {
      const next = chars
        .map((char, index) => {
          if (char === ' ') return ' ';
          const revealIndex = revealDirection === 'start' ? index : chars.length - 1 - index;
          const revealed = sequential ? iteration > revealIndex : iteration >= maxIterations - 1;
          return revealed ? char : randomChar(characters);
        })
        .join('');

      setDisplay(next);
      iteration += 1;

      if (iteration > totalSteps) {
        setDisplay(text);
        window.clearInterval(interval);
      }
    }, speed);

    return () => window.clearInterval(interval);
  }, [animateOn, characters, chars, inView, maxIterations, revealDirection, sequential, shouldAnimate, speed, text]);

  return (
    <span ref={ref} className={className}>
      {display || text}
    </span>
  );
}
