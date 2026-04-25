'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useInView } from 'motion/react';

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  separator?: string;
  className?: string;
  suffix?: string;
  decimals?: number;
}

function formatValue(value: number, separator: string, decimals: number): string {
  if (decimals > 0) {
    const fixed = value.toFixed(decimals);
    if (separator === ',') {
      const [intPart, decPart] = fixed.split('.');
      return Number(intPart).toLocaleString('en-US') + '.' + decPart;
    }
    return fixed;
  }
  const rounded = Math.round(value);
  if (separator === ',') {
    return rounded.toLocaleString('en-US');
  }
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

export default function CountUp({
  to,
  from = 0,
  duration = 1.2,
  separator = ',',
  className = '',
  suffix = '',
  decimals = 0,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let frameId = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (to - from) * eased);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [duration, from, inView, to]);

  const displayValue = useMemo(() => formatValue(value, separator, decimals), [separator, value, decimals]);

  return (
    <span ref={ref} className={className}>
      {displayValue}{suffix}
    </span>
  );
}
