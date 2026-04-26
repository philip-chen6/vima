"use client";

import { useEffect, useRef, useState } from "react";

export function TickerNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (value === prev.current) return;
    const diff = value - prev.current;
    const steps = Math.min(Math.abs(diff), 12);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplay(Math.round(prev.current + (diff * i) / steps));
      if (i >= steps) {
        clearInterval(interval);
        prev.current = value;
      }
    }, 40);
    return () => clearInterval(interval);
  }, [value]);

  return <>{display}</>;
}
