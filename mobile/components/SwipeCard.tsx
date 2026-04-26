"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, type MotionValue, type PanInfo } from "motion/react";
import gsap from "gsap";
import { type Claim } from "@/lib/mock";
import BorderGlow from "./react-bits/BorderGlow";

export type SwipeOutcome = "confirm" | "reject" | "skip";

const SWIPE_THRESHOLD = 110;

export function SwipeCard({
  claim,
  enterFrom,
  onResolve,
  dragX,
  dragY,
}: {
  claim: Claim;
  enterFrom: -1 | 1;
  onResolve: (outcome: SwipeOutcome) => void;
  dragX?: MotionValue<number>;
  dragY?: MotionValue<number>;
}) {
  const localX = useMotionValue(0);
  const localY = useMotionValue(0);
  const x = dragX ?? localX;
  const y = dragY ?? localY;
  const rotate = useTransform(x, [-200, 0, 200], [-10, 0, 10]);

  const confirmEdge = useTransform(x, [20, 160], [0, 1]);
  const rejectEdge = useTransform(x, [-160, -20], [1, 0]);

  const handleEnd = (_e: unknown, info: PanInfo) => {
    const dx = info.offset.x;
    const dy = info.offset.y;
    if (dx > SWIPE_THRESHOLD) onResolve("confirm");
    else if (dx < -SWIPE_THRESHOLD) onResolve("reject");
    else if (dy < -SWIPE_THRESHOLD) onResolve("skip");
  };

  return (
    <motion.div
      key={claim.id}
      initial={{ x: enterFrom * 480, rotate: enterFrom * 12 }}
      animate={{ x: 0, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 26, mass: 0.95 }}
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: 100 }}
    >
      <motion.div
        drag
        dragElastic={0.22}
        dragMomentum={false}
        onDragEnd={handleEnd}
        dragTransition={{ bounceStiffness: 420, bounceDamping: 14 }}
        style={{
          x,
          y,
          rotate,
          pointerEvents: "auto",
          background: "#0a0a10",
          boxShadow:
            "0 30px 60px -20px rgb(0 0 0 / 0.7), 0 18px 36px -24px rgb(255 184 200 / 0.18), inset 0 1px 0 rgb(255 255 255 / 0.05), inset 0 0 0 1px rgb(255 255 255 / 0.06)",
        }}
        className="relative w-[88%] h-[78%] cursor-grab active:cursor-grabbing flex flex-col rounded-[24px] overflow-hidden"
      >
        <motion.div
          aria-hidden
          className="absolute inset-y-0 right-0 w-[3px] pointer-events-none"
          style={{
            opacity: confirmEdge,
            background: "var(--color-pink-hot)",
            boxShadow: "0 0 28px 6px rgb(255 112 144 / 0.55)",
          }}
        />
        <motion.div
          aria-hidden
          className="absolute inset-y-0 left-0 w-[1.5px] pointer-events-none"
          style={{
            opacity: rejectEdge,
            background: "rgb(255 255 255 / 0.5)",
          }}
        />

        <div className="relative z-10 flex flex-col w-full p-5 pt-6">
          <SegmentFrame
            aiSrc={claim.after_image}
            rawSrc={claim.before_image}
            segmentPolygon={claim.segment_polygon}
            edgePolygon={claim.edge_polygon}
            outlineRgb={claim.outline_rgb}
          />

          <div className="flex-1 flex flex-col pt-7">
            <p
              className="text-[40px] leading-[1.1] tracking-[-0.03em] text-[var(--color-text)]"
              style={{ fontWeight: 600 }}
            >
              {claim.text}
            </p>
            <RewardStickerCluster claim={claim} />
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
}

type StickerSpec = {
  src: string;
  className: string;
};

const STICKER_VARIANTS: StickerSpec[][] = [
  [
    { src: "/stickers/mega-draw.png", className: "left-[-4px] top-[-4px] w-[154px] rotate-[-8deg]" },
    { src: "/stickers/tickets-10.png", className: "right-[-2px] top-[36px] w-[142px] rotate-[7deg]" },
    { src: "/stickers/xp-60.png", className: "left-[39%] top-[76px] w-[78px] rotate-[4deg]" },
    { src: "/stickers/conf-099.png", className: "right-[14px] bottom-[24px] w-[108px] rotate-[-5deg]" },
    { src: "/stickers/payout-live.png", className: "left-[6px] bottom-[18px] w-[146px] rotate-[6deg]" },
  ],
  [
    { src: "/stickers/rare-proof.png", className: "right-[-2px] top-[-8px] w-[146px] rotate-[6deg]" },
    { src: "/stickers/run-4x.png", className: "left-[-10px] top-[48px] w-[158px] rotate-[-5deg]" },
    { src: "/stickers/payout-live.png", className: "right-[14px] bottom-[24px] w-[148px] rotate-[4deg]" },
    { src: "/stickers/xp-60.png", className: "left-[42%] bottom-[54px] w-[74px] rotate-[-7deg]" },
  ],
  [
    { src: "/stickers/raffle-open.png", className: "left-[-16px] top-[8px] w-[235px] rotate-[-4deg]" },
    { src: "/stickers/conf-099.png", className: "right-[6px] top-[78px] w-[106px] rotate-[8deg]" },
    { src: "/stickers/mega-draw.png", className: "left-[24px] bottom-[18px] w-[150px] rotate-[5deg]" },
    { src: "/stickers/tickets-10.png", className: "right-[-6px] bottom-[24px] w-[140px] rotate-[-6deg]" },
  ],
  [
    { src: "/stickers/payout-live.png", className: "left-[-6px] top-[2px] w-[168px] rotate-[5deg]" },
    { src: "/stickers/xp-60.png", className: "right-[44px] top-[42px] w-[82px] rotate-[-3deg]" },
    { src: "/stickers/rare-proof.png", className: "right-[-8px] bottom-[52px] w-[136px] rotate-[-7deg]" },
    { src: "/stickers/run-4x.png", className: "left-[8px] bottom-[14px] w-[158px] rotate-[7deg]" },
  ],
  [
    { src: "/stickers/tickets-10.png", className: "left-[-8px] top-[22px] w-[172px] rotate-[6deg]" },
    { src: "/stickers/mega-draw.png", className: "right-[-18px] top-[2px] w-[160px] rotate-[9deg]" },
    { src: "/stickers/conf-099.png", className: "left-[28px] bottom-[34px] w-[116px] rotate-[-8deg]" },
    { src: "/stickers/raffle-open.png", className: "right-[-24px] bottom-[8px] w-[220px] rotate-[-4deg]" },
  ],
  [
    { src: "/stickers/run-4x.png", className: "right-[6px] top-[2px] w-[160px] rotate-[4deg]" },
    { src: "/stickers/rare-proof.png", className: "left-[-6px] top-[62px] w-[140px] rotate-[-7deg]" },
    { src: "/stickers/xp-60.png", className: "left-[44%] top-[76px] w-[76px] rotate-[6deg]" },
    { src: "/stickers/payout-live.png", className: "left-[18px] bottom-[16px] w-[150px] rotate-[3deg]" },
    { src: "/stickers/conf-099.png", className: "right-[12px] bottom-[22px] w-[106px] rotate-[-4deg]" },
  ],
];

function RewardStickerCluster({ claim }: { claim: Claim }) {
  const idNumber = Number(claim.id.replace(/\D/g, "")) || 0;
  const variant = STICKER_VARIANTS[idNumber % STICKER_VARIANTS.length];
  const stickers = claim.rare
    ? variant.map((s, i) => (i === 0 ? { ...s, src: "/stickers/rare-proof.png" } : s))
    : variant;

  return (
    <div
      className="relative mt-7 min-h-[235px] flex-1 overflow-visible"
      style={{
        maskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
      }}
    >
      {stickers.map((sticker, index) => (
        <StickerImage
          key={`${claim.id}-${sticker.src}-${index}`}
          src={sticker.src}
          className={sticker.className}
          delay={index * 0.035}
        />
      ))}
    </div>
  );
}

function StickerImage({
  src,
  className,
  delay = 0,
}: {
  src: string;
  className: string;
  delay?: number;
}) {
  return (
    <motion.img
      aria-hidden
      src={src}
      alt=""
      draggable={false}
      initial={{ opacity: 0, y: 16, scale: 0.92, rotate: 0 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 18, delay }}
      className={`vima-sticker-image absolute select-none pointer-events-none ${className}`}
    />
  );
}

function resample(poly: [number, number][], n: number): [number, number][] {
  if (poly.length === 0) return [];
  if (poly.length === n) return poly;
  const segLens: number[] = [];
  let total = 0;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const d = Math.hypot(bx - ax, by - ay);
    segLens.push(d);
    total += d;
  }
  const step = total / n;
  const out: [number, number][] = [];
  let segIdx = 0;
  let segOffset = 0;
  for (let i = 0; i < n; i++) {
    const target = i * step;
    while (segIdx < segLens.length && segOffset + segLens[segIdx] < target) {
      segOffset += segLens[segIdx];
      segIdx++;
    }
    if (segIdx >= segLens.length) {
      out.push([...poly[0]]);
      continue;
    }
    const [ax, ay] = poly[segIdx];
    const [bx, by] = poly[(segIdx + 1) % poly.length];
    const t = segLens[segIdx] === 0 ? 0 : (target - segOffset) / segLens[segIdx];
    out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
  }
  return out;
}

function projectFromMaskToFrame(poly: [number, number][]): [number, number][] {
  if (!poly.length) return [];
  const eps = 0.001;
  const [cx, cy] = poly.reduce(
    ([sx, sy], [px, py]) => [sx + px, sy + py] as [number, number],
    [0, 0] as [number, number],
  ).map((sum) => sum / poly.length) as [number, number];

  return poly.map(([px, py]) => {
    const dx = px - cx;
    const dy = py - cy;
    const tx = dx > 0 ? (1 - eps - cx) / dx : dx < 0 ? (eps - cx) / dx : Number.POSITIVE_INFINITY;
    const ty = dy > 0 ? (1 - eps - cy) / dy : dy < 0 ? (eps - cy) / dy : Number.POSITIVE_INFINITY;
    const t = Math.min(tx, ty);

    if (!Number.isFinite(t) || t <= 0) {
      return [px, py];
    }

    return [
      Math.max(eps, Math.min(1 - eps, cx + dx * t)),
      Math.max(eps, Math.min(1 - eps, cy + dy * t)),
    ];
  });
}

function buildPath(pts: [number, number][]): string {
  if (!pts.length) return "";
  return (
    `M ${pts[0][0] * 100} ${pts[0][1] * 100} ` +
    pts.slice(1).map(([px, py]) => `L ${px * 100} ${py * 100}`).join(" ") +
    " Z"
  );
}

function buildClipPath(pts: [number, number][]): string {
  if (!pts.length) return "none";
  return `polygon(${pts.map(([px, py]) => `${(px * 100).toFixed(2)}% ${(py * 100).toFixed(2)}%`).join(", ")})`;
}

function SegmentFrame({
  aiSrc,
  rawSrc,
  segmentPolygon,
  edgePolygon: _edgePolygon,
  outlineRgb,
}: {
  aiSrc: string;
  rawSrc: string;
  segmentPolygon: [number, number][];
  edgePolygon: [number, number][];
  outlineRgb: [number, number, number];
}) {
  const [expanded, setExpanded] = useState(true);
  const [isWhite, setIsWhite] = useState(true);
  const whiteDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rawImgRef = useRef<HTMLImageElement>(null);
  const pathOuterRef = useRef<SVGPathElement>(null);
  const pathMidRef = useRef<SVGPathElement>(null);
  const pathCoreRef = useRef<SVGPathElement>(null);
  const pathShineRef = useRef<SVGPathElement>(null);
  const currentRef = useRef<[number, number][]>([]);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  const stroke = `rgb(${outlineRgb[0]}, ${outlineRgb[1]}, ${outlineRgb[2]})`;
  const filterId = `seg-glow-${outlineRgb.join("-")}`;
  const shineId = `seg-shine-${outlineRgb.join("-")}`;

  const segPts = useMemo(() => segmentPolygon, [segmentPolygon]);
  const edgePts = useMemo(() => projectFromMaskToFrame(segPts), [segPts]);

  const apply = (pts: [number, number][]) => {
    currentRef.current = pts;
    const d = buildPath(pts);
    pathOuterRef.current?.setAttribute("d", d);
    pathMidRef.current?.setAttribute("d", d);
    pathCoreRef.current?.setAttribute("d", d);
    pathShineRef.current?.setAttribute("d", d);
    pathMidRef.current?.setAttribute("stroke", expanded ? "#ffffff" : stroke);
    pathCoreRef.current?.setAttribute("stroke", expanded ? "#ffffff" : stroke);
    if (rawImgRef.current) rawImgRef.current.style.clipPath = buildClipPath(pts);
  };

  useLayoutEffect(() => {
    apply(edgePts);
    const t = setTimeout(() => setExpanded(false), 600);
    return () => {
      clearTimeout(t);
      if (whiteDelayRef.current) clearTimeout(whiteDelayRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initRef = useRef(false);
  useEffect(() => {
    if (whiteDelayRef.current) clearTimeout(whiteDelayRef.current);
    if (expanded) {
      whiteDelayRef.current = setTimeout(() => setIsWhite(true), 780);
    } else {
      setIsWhite(false);
    }
    if (!initRef.current) {
      initRef.current = true;
      return;
    }
    tweenRef.current?.kill();
    const start = currentRef.current.map(([sx, sy]) => [sx, sy] as [number, number]);
    const target = expanded ? edgePts : segPts;
    if (!start.length || !target.length || start.length !== target.length) {
      apply(target);
      return;
    }
    // Color tween only. When the contour expands from the detected figure to
    // the edge of the frame, it becomes white so the full-video state is clear.
    const colorTargets = [pathMidRef.current, pathCoreRef.current].filter(Boolean) as SVGPathElement[];
    gsap.to(colorTargets, {
      stroke: expanded ? "#ffffff" : stroke,
      duration: 1.0,
      ease: "power3.inOut",
    });
    const proxy = { t: 0 };
    tweenRef.current = gsap.to(proxy, {
      t: 1,
      duration: 1.0,
      ease: "power3.inOut",
      onUpdate: () => {
        const u = proxy.t;
        const pts: [number, number][] = start.map(([sx, sy], i) => {
          const [tx, ty] = target[i];
          return [sx + (tx - sx) * u, sy + (ty - sy) * u];
        });
        apply(pts);
      },
    });
  }, [expanded, edgePts, segPts, stroke]);

  return (
    <BorderGlow
      glowColor="340 95 70"
      backgroundColor="#0a0a10"
      borderRadius={10}
      glowRadius={36}
      glowIntensity={1.6}
      coneSpread={32}
      animated={true}
      colors={["#ffb8c8", "#ff7090", "#ffe9b3"]}
      className="vima-segment-frame w-full"
    >
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden cursor-pointer vima-frame-glow"
        style={{ aspectRatio: "4 / 3", borderRadius: 10 }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((v) => !v);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={aiSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          draggable={false}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={rawImgRef}
          src={rawSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          draggable={false}
        />
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* white + gold ONLY — no pink dim zones. 3 bright bands repeating. */}
            <linearGradient id={shineId} x1="0%" y1="0%" x2="100%" y2="0%" gradientUnits="objectBoundingBox">
              <stop offset="0%"   stopColor="#ffffff" />
              <stop offset="16%"  stopColor="#ffe9b3" />
              <stop offset="33%"  stopColor="#ffffff" />
              <stop offset="50%"  stopColor="#ffe9b3" />
              <stop offset="66%"  stopColor="#ffffff" />
              <stop offset="83%"  stopColor="#ffe9b3" />
              <stop offset="100%" stopColor="#ffffff" />
              <animateTransform
                attributeName="gradientTransform"
                type="rotate"
                from="0 0.5 0.5"
                to="360 0.5 0.5"
                dur="5s"
                repeatCount="indefinite"
              />
            </linearGradient>
          </defs>
          {/* dark contour — contrast backdrop, slimmer than the previous pass */}
          <path
            ref={pathOuterRef}
            fill="none"
            stroke="#000000"
            strokeWidth={8}
            strokeLinejoin="miter"
            strokeMiterlimit={4}
            vectorEffect="non-scaling-stroke"
            style={{
              filter: "blur(3px)",
              opacity: expanded ? 0 : 0.4,
              transition: "opacity 0.5s ease-out",
            }}
          />
          {/* white bloom — the GLOW (toned down from the heavy pass) */}
          <path
            ref={pathMidRef}
            fill="none"
            stroke="#ffffff"
            strokeWidth={4}
            strokeLinejoin="miter"
            strokeMiterlimit={4}
            vectorEffect="non-scaling-stroke"
            filter={`url(#${filterId})`}
            style={{
              opacity: expanded ? 0 : 0.95,
              transition: "opacity 0.5s ease-out",
            }}
          />
          <path
            ref={pathCoreRef}
            fill="none"
            stroke="#ffffff"
            strokeWidth={1.2}
            strokeLinejoin="miter"
            strokeMiterlimit={4}
            vectorEffect="non-scaling-stroke"
            style={{
              opacity: expanded ? 0 : 1,
              transition: "opacity 0.5s ease-out",
            }}
          />
          {/* shiny rotating-gradient on top — chromy shimmer */}
          <path
            ref={pathShineRef}
            fill="none"
            stroke={`url(#${shineId})`}
            strokeWidth={2.4}
            strokeLinejoin="miter"
            strokeMiterlimit={4}
            vectorEffect="non-scaling-stroke"
            style={{
              opacity: expanded ? 0 : 1,
              transition: "opacity 0.5s ease-out",
            }}
          />
        </svg>
        <span
          aria-hidden
          className="absolute inset-0 pointer-events-none vima-frame-pulse"
          style={{ borderRadius: "inherit" }}
        />
        <span
          aria-hidden
          className="absolute inset-0 pointer-events-none vima-frame-pulse-white"
          style={{ borderRadius: "inherit", opacity: isWhite ? 1 : 0 }}
        />
      </div>
    </BorderGlow>
  );
}
