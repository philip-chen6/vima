"use client";

import { motion } from "motion/react";

const WASHI = "#f7ecef";
const SAKURA = "#A64D79";
const HOT = "#f2a7b8";
const LANTERN = "#ffd3a6";
const RED = "#ef476f";

type Props = {
  id: string;
  active?: boolean;
};

const lineProps = {
  fill: "none",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  vectorEffect: "non-scaling-stroke" as const,
};

export function SidebarSectionIcon({ id, active = false }: Props) {
  const icon = normalizeIcon(id);
  const animate = active ? { opacity: 1, pathLength: 1 } : { opacity: 0.56, pathLength: 0.72 };
  const pulse = active ? { scale: [1, 1.08, 1], opacity: [0.76, 1, 0.76] } : { scale: 1, opacity: 0.62 };
  const transition = active
    ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" as const }
    : { duration: 0.2 };

  return (
    <span
      className="vima-sidebar-tab-icon"
      aria-hidden="true"
      data-active={active ? "true" : "false"}
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: 24,
        height: 24,
        flex: "0 0 24px",
        marginRight: 2,
      }}
    >
      <svg
        viewBox="0 0 32 32"
        role="img"
        style={{
          display: "block",
          width: 24,
          height: 24,
          overflow: "visible",
          filter: active
            ? "drop-shadow(0 0 10px rgba(242, 167, 184, 0.2))"
            : "drop-shadow(0 0 8px rgba(242, 167, 184, 0.08))",
        }}
      >
        <rect x="4.5" y="4.5" width="23" height="23" stroke={SAKURA} opacity="0.26" fill="rgba(247,236,239,0.025)" />
        {icon === "overview" && (
          <>
            <motion.path d="M9 20 L16 10 L23 20" stroke={HOT} strokeWidth="1.4" {...lineProps} animate={animate} />
            <motion.circle cx="16" cy="16" r="2.6" fill={HOT} animate={pulse} transition={transition} />
            <path d="M10 23 H22" stroke={WASHI} strokeWidth="1" opacity="0.5" {...lineProps} />
          </>
        )}
        {icon === "stats" && (
          <>
            {[9, 14.5, 20].map((x, i) => (
              <motion.path key={x} d={`M${x} 22 V${18 - i * 3}`} stroke={i === 1 ? HOT : SAKURA} strokeWidth="2" {...lineProps} animate={active ? { pathLength: [0.25, 1, 0.55] } : { pathLength: 0.7 }} transition={{ duration: 1.8, repeat: active ? Infinity : 0, delay: i * 0.12 }} />
            ))}
            <path d="M8 24 H24" stroke={WASHI} strokeWidth="1" opacity="0.42" {...lineProps} />
          </>
        )}
        {icon === "analyzer" && (
          <>
            <path d="M8 9 H17 V18 H8 Z" stroke={WASHI} strokeWidth="1.1" opacity="0.52" {...lineProps} />
            <motion.path d="M18.5 10.5 H24 M18.5 14 H22 M18.5 17.5 H24" stroke={HOT} strokeWidth="1.2" {...lineProps} animate={animate} />
            <motion.path d="M11 13 L14 16 L17 10" stroke={LANTERN} strokeWidth="1.2" {...lineProps} animate={active ? { pathLength: [0, 1, 1] } : { pathLength: 0.65 }} transition={transition} />
          </>
        )}
        {icon === "depth" && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.ellipse key={i} cx="16" cy="16" rx={4 + i * 3.2} ry={2.2 + i * 1.7} stroke={i === 1 ? HOT : SAKURA} strokeWidth="1" fill="none" animate={active ? { scale: [0.96, 1.06, 0.96], opacity: [0.35, 0.92, 0.35] } : { opacity: 0.44 }} transition={{ duration: 1.8, repeat: active ? Infinity : 0, delay: i * 0.16 }} />
            ))}
            <circle cx="16" cy="16" r="1.6" fill={HOT} />
          </>
        )}
        {icon === "depth-filter" && (
          <>
            <path d="M8 10 H24 M8 16 H24 M8 22 H24" stroke={WASHI} strokeWidth="0.9" opacity="0.35" {...lineProps} />
            <motion.path d="M10 10 H18 M10 16 H23 M10 22 H15" stroke={HOT} strokeWidth="1.4" {...lineProps} animate={active ? { pathLength: [0.2, 1, 0.55] } : { pathLength: 0.7 }} transition={transition} />
            <motion.path d="M20 8 L24 12 M24 8 L20 12" stroke={RED} strokeWidth="1.2" {...lineProps} animate={active ? { opacity: [0.35, 1, 0.35] } : { opacity: 0.58 }} transition={transition} />
          </>
        )}
        {icon === "reconstruction" && (
          <>
            {[10, 16, 22].map((x, i) => <circle key={x} cx={x} cy={12 + i * 4} r="1.3" fill={i === 1 ? HOT : WASHI} opacity="0.78" />)}
            <motion.path d="M9 21 L16 12 L24 20 M16 12 V24" stroke={SAKURA} strokeWidth="1.1" {...lineProps} animate={active ? { rotate: [0, 4, -4, 0], pathLength: 1 } : { rotate: 0, pathLength: 0.74 }} transition={transition} style={{ transformOrigin: "16px 16px" }} />
            <path d="M8 23 H24" stroke={WASHI} strokeWidth="1" opacity="0.34" {...lineProps} />
          </>
        )}
        {icon === "ledger" && (
          <>
            {[9, 14, 19].map((y, i) => (
              <motion.path key={y} d={`M9 ${y} H23`} stroke={i === 1 ? HOT : WASHI} strokeWidth="1.1" {...lineProps} animate={active ? { pathLength: [0.35, 1, 0.7] } : { pathLength: 0.72 }} transition={{ duration: 1.7, repeat: active ? Infinity : 0, delay: i * 0.1 }} />
            ))}
            <motion.path d="M10 23 H20" stroke={RED} strokeWidth="1.4" {...lineProps} animate={active ? { pathLength: [0.15, 1, 0.4] } : { pathLength: 0.45 }} transition={transition} />
          </>
        )}
        {icon === "temporal" && (
          <>
            <motion.path d="M9 16 H23" stroke={SAKURA} strokeWidth="1" {...lineProps} animate={animate} />
            {[10, 16, 22].map((x, i) => (
              <motion.circle key={x} cx={x} cy="16" r={i === 1 ? "2" : "1.3"} fill={i === 1 ? HOT : WASHI} animate={active ? { opacity: [0.45, 1, 0.45] } : { opacity: 0.62 }} transition={{ ...transition, delay: i * 0.16 }} />
            ))}
            <path d="M10 22 L16 10 L22 22" stroke={HOT} strokeWidth="1.1" opacity="0.64" {...lineProps} />
          </>
        )}
        {icon === "episode" && (
          <>
            <path d="M9 9 H23 V23 H9 Z" stroke={WASHI} strokeWidth="1" opacity="0.42" {...lineProps} />
            <motion.path d="M12 13 H20 M12 17 H18 M12 21 H21" stroke={HOT} strokeWidth="1.1" {...lineProps} animate={animate} />
          </>
        )}
        {icon === "constellation" && (
          <>
            <motion.path d="M10 20 L15 11 L22 14 L19 23 Z" stroke={SAKURA} strokeWidth="1" {...lineProps} animate={animate} />
            {[10, 15, 22, 19].map((x, i) => (
              <circle key={`${x}-${i}`} cx={x} cy={[20, 11, 14, 23][i]} r="1.5" fill={i === 1 ? HOT : WASHI} opacity="0.74" />
            ))}
          </>
        )}
        {icon === "compare" && (
          <>
            <path d="M8 9 H15 V23 H8 Z M17 9 H24 V23 H17 Z" stroke={WASHI} strokeWidth="1" opacity="0.42" {...lineProps} />
            <motion.path d="M16 8 V24" stroke={HOT} strokeWidth="1.3" {...lineProps} animate={active ? { y: [-2, 2, -2], opacity: [0.65, 1, 0.65] } : { y: 0, opacity: 0.64 }} transition={transition} />
          </>
        )}
        {icon === "links" && (
          <>
            <path d="M11 12 H21 M11 16 H19 M11 20 H23" stroke={HOT} strokeWidth="1.1" {...lineProps} />
            <path d="M8 12 H8.2 M8 16 H8.2 M8 20 H8.2" stroke={WASHI} strokeWidth="2" {...lineProps} />
          </>
        )}
        {!["overview", "stats", "analyzer", "depth", "depth-filter", "reconstruction", "ledger", "temporal", "episode", "constellation", "compare", "links"].includes(icon) && (
          <motion.path d="M9 16 H23 M16 9 V23" stroke={HOT} strokeWidth="1.3" {...lineProps} animate={animate} />
        )}
      </svg>
    </span>
  );
}

function normalizeIcon(id: string) {
  if (id === "spatial-inference") return "depth";
  if (id === "eval") return "temporal";
  if (id === "demo") return "overview";
  if (id === "episode-detail") return "episode";
  if (id === "baseline") return "compare";
  if (id === "footer-nav") return "links";
  if (id === "landing") return "overview";
  return id;
}
