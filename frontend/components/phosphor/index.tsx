"use client";

/**
 * Phosphor Terminal primitives — see DESIGN.md
 * Adapted from ~/Downloads/output/reactbits-signal-lab/src/App.tsx
 */

import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

// ─── Tokens ───────────────────────────────────────────────────────────────
export const PHOSPHOR = {
  ink: "#080503",
  ink2: "#0d0805",
  cream: "#e8d5c0",
  creamDim: "rgba(232,213,192,0.55)",
  creamMute: "rgba(232,213,192,0.25)",
  amber: "#f59e0b",
  amberDim: "rgba(245,158,11,0.55)",
  amberLine: "rgba(245,158,11,0.10)",
  amberSoft: "rgba(245,158,11,0.04)",
  orange: "#fb923c",
  red: "#ef4444",
  green: "#4ade80",
  glowSm: "0 0 8px rgba(245,158,11,0.35)",
  glowMd: "0 0 16px rgba(245,158,11,0.30), 0 0 32px rgba(245,158,11,0.10)",
  glowLg: "0 0 24px rgba(245,158,11,0.45), 0 0 48px rgba(245,158,11,0.20)",
} as const;

// ─── EyebrowLabel ────────────────────────────────────────────────────────
export function EyebrowLabel({
  children,
  arrow = true,
  color = PHOSPHOR.amberDim,
  size = 8,
  spacing = "0.45em",
}: {
  children: React.ReactNode;
  arrow?: boolean;
  color?: string;
  size?: number;
  spacing?: string;
}) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: `${size}px`,
        letterSpacing: spacing,
        color,
        textTransform: "uppercase",
      }}
    >
      {arrow ? "▸ " : ""}
      {children}
    </div>
  );
}

// ─── PulseDot ────────────────────────────────────────────────────────────
export function PulseDot({
  color = PHOSPHOR.amber,
  size = 6,
  glow = true,
}: {
  color?: string;
  size?: number;
  glow?: boolean;
}) {
  return (
    <div
      className="vima-pulse"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        background: color,
        boxShadow: glow ? `0 0 8px ${color}99` : "none",
        flexShrink: 0,
      }}
    />
  );
}

// ─── HazardRule ──────────────────────────────────────────────────────────
export function HazardRule({
  opacity = 0.1,
  spacing = "16px 0",
}: {
  opacity?: number;
  spacing?: string;
}) {
  return (
    <div
      style={{
        height: "1px",
        background: `rgba(245,158,11,${opacity})`,
        margin: spacing,
        width: "100%",
      }}
    />
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────
export function Panel({
  title,
  subtitle,
  children,
  span = 1,
  className,
  style,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  span?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        gridColumn: `span ${span}`,
        border: `1px solid ${PHOSPHOR.amberLine}`,
        background: PHOSPHOR.ink,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `1px solid rgba(245,158,11,0.07)`,
            paddingBottom: "8px",
            marginBottom: "8px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.25em",
              color: "rgba(245,158,11,0.55)",
            }}
          >
            {title}
          </span>
          {subtitle && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "8px",
                letterSpacing: "0.15em",
                color: "rgba(255,255,255,0.20)",
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

// ─── StatCell ────────────────────────────────────────────────────────────
export function StatCell({
  label,
  value,
  accent = false,
  glow = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  glow?: boolean;
}) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRight: "1px solid rgba(255,255,255,0.04)",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "8px",
          letterSpacing: "0.20em",
          color: PHOSPHOR.creamMute,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "17px",
          fontWeight: 700,
          color: accent ? PHOSPHOR.amber : PHOSPHOR.cream,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.04em",
          textShadow: glow ? PHOSPHOR.glowSm : "none",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── PipelineStep ────────────────────────────────────────────────────────
export function PipelineStep({
  num,
  title,
  desc,
  status = "ACTIVE",
  statusColor = PHOSPHOR.amber,
}: {
  num: string;
  title: string;
  desc: string;
  status?: string;
  statusColor?: string;
}) {
  return (
    <div
      style={{
        padding: "16px 18px",
        background: "rgba(8,5,3,0.85)",
        border: `1px solid ${PHOSPHOR.amberLine}`,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "16px",
              fontWeight: 700,
              color: "rgba(245,158,11,0.20)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {num}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.20em",
              color: "rgba(245,158,11,0.65)",
            }}
          >
            {title}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <PulseDot color={statusColor} size={4} />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "7px",
              letterSpacing: "0.20em",
              color: `${statusColor}AA`,
            }}
          >
            {status}
          </span>
        </div>
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          color: "rgba(255,255,255,0.30)",
          lineHeight: 1.75,
          letterSpacing: "0.03em",
        }}
      >
        {desc}
      </div>
    </div>
  );
}

// ─── ZoneRow ─────────────────────────────────────────────────────────────
export function ZoneRow({
  name,
  pct,
  productive,
  total,
  range,
}: {
  name: string;
  pct: number;
  productive: number;
  total: number;
  range?: string;
}) {
  const barColor = pct >= 90 ? PHOSPHOR.amber : pct >= 70 ? PHOSPHOR.orange : PHOSPHOR.red;
  return (
    <div
      style={{
        padding: "10px 12px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "6px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: PHOSPHOR.cream,
          }}
        >
          {name}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            fontWeight: 700,
            color: barColor,
            fontVariantNumeric: "tabular-nums",
            textShadow: `0 0 10px ${barColor}50`,
          }}
        >
          {pct.toFixed(0)}%
        </span>
      </div>
      <div
        style={{
          height: "2px",
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${barColor}80, ${barColor})`,
            transition: "width 0.6s ease",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "6px",
          fontSize: "8px",
          color: "rgba(255,255,255,0.20)",
          letterSpacing: "0.10em",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span>
          {productive}/{total} PRODUCTIVE
        </span>
        {range && <span>{range}</span>}
      </div>
    </div>
  );
}

// ─── BreakdownCell ───────────────────────────────────────────────────────
export function BreakdownCell({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
  return (
    <div style={{ padding: "10px 12px", background: PHOSPHOR.ink }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "8px",
          letterSpacing: "0.20em",
          color: `${color}AA`,
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "20px",
            fontWeight: 700,
            color,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {count}
        </span>
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.20)", fontFamily: "var(--font-mono)" }}>
          / {total}
        </span>
        <span style={{ fontSize: "10px", color: `${color}88`, marginLeft: "auto", fontFamily: "var(--font-mono)" }}>
          {pct}%
        </span>
      </div>
      <div
        style={{
          marginTop: "6px",
          height: "2px",
          background: "rgba(255,255,255,0.05)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${total > 0 ? (count / total) * 100 : 0}%`,
            background: `linear-gradient(90deg, ${color}AA, ${color})`,
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── HeaderRibbon ────────────────────────────────────────────────────────
export function HeaderRibbon({
  date,
  time,
  status = "LIVE",
  online = true,
}: {
  date: string;
  time: string;
  status?: string;
  online?: boolean;
}) {
  return (
    <header
      style={{
        borderBottom: `1px solid ${PHOSPHOR.amberLine}`,
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(8,5,3,0.96)",
        backdropFilter: "blur(16px)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <span
          className="vima-flicker"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "0.32em",
            color: PHOSPHOR.amber,
            textShadow: PHOSPHOR.glowMd,
          }}
        >
          vima
        </span>
        <div
          style={{
            borderLeft: "1px solid rgba(245,158,11,0.15)",
            paddingLeft: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "8px",
              letterSpacing: "0.25em",
              color: "rgba(245,158,11,0.40)",
            }}
          >
            SPATIAL INTELLIGENCE
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "7px",
              letterSpacing: "0.15em",
              color: "rgba(232,213,192,0.20)",
            }}
          >
            CONSTRUCTION INTELLIGENCE INDEX
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", letterSpacing: "0.18em", color: "rgba(245,158,11,0.30)" }}>
          {date}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.08em",
            color: "rgba(245,158,11,0.60)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {time}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <PulseDot color={online ? PHOSPHOR.amber : PHOSPHOR.red} size={6} />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "8px",
              letterSpacing: "0.20em",
              color: online ? "rgba(245,158,11,0.45)" : "rgba(239,68,68,0.50)",
            }}
          >
            {online ? status : "OFFLINE"}
          </span>
        </div>
      </div>
    </header>
  );
}

// ─── StatsRibbon ─────────────────────────────────────────────────────────
export function StatsRibbon({ cells }: { cells: { label: string; value: string | number; accent?: boolean; glow?: boolean }[] }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.06, delayChildren: 0.1 },
        },
      }}
      style={{
        borderBottom: "1px solid rgba(245,158,11,0.06)",
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(160px, 1fr))`,
        background: "rgba(245,158,11,0.015)",
        position: "relative",
      }}
    >
      {cells.map((c, i) => (
        <motion.div
          key={i}
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] } },
          }}
        >
          <StatCell {...c} />
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── AnimatedNumber — count up to a target ────────────────────────────────
export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  duration = 1.2,
  delay = 0,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  delay?: number;
}) {
  const [display, setDisplay] = useState("0");
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 });

  useEffect(() => {
    const timer = setTimeout(() => motionValue.set(value), delay * 1000);
    const unsubscribe = spring.on("change", (v) => {
      setDisplay(v.toFixed(decimals));
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [value, motionValue, spring, decimals, delay]);

  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

// ─── Section — motion-wrapped fade-up on scroll into view ────────────────
export function Section({
  children,
  delay = 0,
  amount = 0.2,
  className,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  amount?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.6, delay, ease: [0.2, 0.8, 0.2, 1] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ─── StaggerGrid — stagger fade-up across grid children ──────────────────
export function StaggerGrid({
  children,
  cols,
  gap = "1px",
  bg,
  className,
  style,
  staggerStep = 0.08,
}: {
  children: React.ReactNode;
  cols: string;
  gap?: string;
  bg?: string;
  className?: string;
  style?: React.CSSProperties;
  staggerStep?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerStep } },
      }}
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: cols,
        gap,
        background: bg,
        ...style,
      }}
    >
      {React.Children.map(children, (child) => (
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 16 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] } },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
