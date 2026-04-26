"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { BadgeCheck, Camera, Coins, FileSearch, MapPinned, ScanSearch } from "lucide-react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Observer } from "gsap/Observer";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Flicker from "@/components/react-bits/flicker";
import styles from "./pipeline-stepper.module.css";

gsap.registerPlugin(MotionPathPlugin, Observer, ScrollTrigger);

type PipelineNode = {
  id: string;
  num: string;
  title: string;
  eyebrow: string;
  metric: string;
  body: string;
  Icon: typeof Camera;
  position: { x: string; y: string };
  rows: Array<[string, string]>;
};

const nodes: PipelineNode[] = [
  {
    id: "capture",
    num: "01",
    title: "capture",
    eyebrow: "video ingress",
    metric: "00.0s",
    body: "bodycam frames enter as raw site evidence, still traceable to the worker view.",
    Icon: Camera,
    position: { x: "8%", y: "66%" },
    rows: [
      ["input", "hardhat video"],
      ["sample", "30 frames"],
      ["state", "unsettled"],
    ],
  },
  {
    id: "classify",
    num: "02",
    title: "classify",
    eyebrow: "CII judgement",
    metric: "0.939 mean P",
    body: "each frame becomes a productive, contributory, or non-contributory claim with confidence attached.",
    Icon: ScanSearch,
    position: { x: "36%", y: "48%" },
    rows: [
      ["model", "CII classifier"],
      ["labels", "P / C / NC"],
      ["review", "frame trail"],
    ],
  },
  {
    id: "anchor",
    num: "03",
    title: "anchor",
    eyebrow: "spatial bind",
    metric: "3 zones",
    body: "COLMAP pose clusters bind the claim to the site zone where the work happened.",
    Icon: MapPinned,
    position: { x: "65%", y: "28%" },
    rows: [
      ["map", "COLMAP sparse"],
      ["zones", "a / b / c"],
      ["proof", "inspectable"],
    ],
  },
  {
    id: "settle",
    num: "04",
    title: "settle",
    eyebrow: "reward gate",
    metric: "86.7% wrench",
    body: "verified productive time becomes the SPL payout basis, with the original evidence still behind it.",
    Icon: Coins,
    position: { x: "88%", y: "18%" },
    rows: [
      ["eligible", "26 / 30"],
      ["basis", "wrench time"],
      ["output", "SPL payout"],
    ],
  },
];

const packetLabels = ["claim", "zone", "receipt"];

const mediaSlots = [
  {
    id: "frame",
    label: "frame crop",
    src: "/figures/fig_temporal_timeline.png",
    position: { left: "14%", top: "17%" },
  },
  {
    id: "zone",
    label: "zone map",
    src: "/figures/exp_i_zone_segmentation.png",
    position: { left: "55%", top: "62%" },
  },
  {
    id: "receipt",
    label: "payout trace",
    src: "/figures/architecture.png",
    position: { left: "76%", top: "42%" },
  },
];

export default function PipelineStepper() {
  const rootRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef<SVGPathElement>(null);
  const packetRefs = useRef<Array<HTMLDivElement | null>>([]);
  const activeIndexRef = useRef(0);
  const gestureLockedRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = nodes[activeIndex] ?? nodes[0];
  const ActiveIcon = active.Icon;

  const setActiveNode = (index: number) => {
    const next = (index + nodes.length) % nodes.length;
    activeIndexRef.current = next;
    setActiveIndex(next);
  };

  useLayoutEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const route = routeRef.current;
    if (!root || !route) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        reduce: "(prefers-reduced-motion: reduce)",
        desktop: "(min-width: 760px)",
      },
      (context) => {
        const conditions = context.conditions as { reduce?: boolean; desktop?: boolean };
        const reduce = Boolean(conditions.reduce);
        const ctx = gsap.context(() => {
          const routeLength = route.getTotalLength();
          const nodesEls = gsap.utils.toArray<HTMLElement>("[data-pipeline-node]");
          const mapItems = gsap.utils.toArray<HTMLElement>("[data-pipeline-map-item]");
          const packets = packetRefs.current.filter((packet): packet is HTMLDivElement => Boolean(packet));
          let drawTrigger: ScrollTrigger | undefined;
          const fallbackTimers: number[] = [];

          gsap.set(route, {
            strokeDasharray: routeLength,
            strokeDashoffset: 0,
          });

          gsap.set(nodesEls, {
            autoAlpha: 1,
            y: 0,
            scale: 1,
          });

          gsap.set(mapItems, {
            autoAlpha: 1,
            y: 0,
          });

          if (!reduce) {
            const drawTl = gsap
              .timeline({
                paused: true,
                defaults: { ease: "power3.out" },
              })
              .fromTo(route, { strokeDashoffset: routeLength }, { strokeDashoffset: 0, duration: 1, immediateRender: false }, 0)
              .fromTo(
                mapItems,
                { autoAlpha: 0, y: 16 },
                { autoAlpha: 1, y: 0, duration: 0.44, stagger: 0.06, immediateRender: false },
                0.08,
              )
              .fromTo(
                nodesEls,
                { autoAlpha: 0, y: 18, scale: 0.94 },
                { autoAlpha: 1, y: 0, scale: 1, duration: 0.52, stagger: 0.1, immediateRender: false },
                0.16,
              );

            drawTrigger = ScrollTrigger.create({
              trigger: root,
              start: "top 78%",
              once: true,
              onEnter: () => drawTl.play(0),
            });

            const playIfVisible = () => {
              const rect = root.getBoundingClientRect();
              if (rect.top < window.innerHeight * 0.86 && rect.bottom > window.innerHeight * 0.12) {
                drawTl.play(0);
              }
            };

            fallbackTimers.push(window.setTimeout(playIfVisible, 120));
            fallbackTimers.push(window.setTimeout(playIfVisible, 900));

            packets.forEach((packet, index) => {
              gsap.set(packet, { autoAlpha: 0 });
              gsap.to(packet, {
                autoAlpha: 1,
                duration: 0.24,
                delay: index * 1.35,
                repeat: -1,
                yoyo: true,
                repeatDelay: 4.1,
                ease: "power1.inOut",
              });
              gsap.to(packet, {
                duration: 5.2,
                delay: index * 1.35,
                repeat: -1,
                ease: "none",
                motionPath: {
                  path: route,
                  align: route,
                  alignOrigin: [0.5, 0.5],
                },
              });
            });
          }

          const observer = Observer.create({
            target: root,
            type: "wheel,touch,pointer",
            tolerance: 46,
            dragMinimum: 22,
            lockAxis: true,
            allowClicks: true,
            preventDefault: false,
            onUp: () => step(1),
            onDown: () => step(-1),
            onLeft: () => step(1),
            onRight: () => step(-1),
          });

          function step(direction: 1 | -1) {
            if (gestureLockedRef.current || !conditions.desktop) return;

            gestureLockedRef.current = true;
            setActiveNode(activeIndexRef.current + direction);
            window.setTimeout(() => {
              gestureLockedRef.current = false;
            }, reduce ? 120 : 520);
          }

          return () => {
            fallbackTimers.forEach((timer) => window.clearTimeout(timer));
            observer.kill();
            drawTrigger?.kill();
          };
        }, root);

        return () => ctx.revert();
      },
    );

    return () => mm.revert();
  }, []);

  return (
    <div ref={rootRef} className={styles.shell}>
      <div className={styles.texture} aria-hidden="true">
        <Flicker
          spacing={16}
          particleSize={1}
          colorPalette={["#A64D79", "#f2a7b8", "#ffd3a6"]}
          glowColor="#f2a7b8"
          alpha={0.28}
          overlay={0.16}
          overlayColor="#080503"
          minFrequency={0.1}
          maxFrequency={0.54}
          rate={0.34}
          shape="square"
          jitter
          flickerChance={0.22}
          mouseEffect={false}
        />
      </div>

      <div className={styles.map}>
        <svg className={styles.routeSvg} viewBox="0 0 1000 560" aria-hidden="true" data-pipeline-map-item>
          <defs>
            <linearGradient id="pipeline-route-gradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#6A1E55" stopOpacity="0.28" />
              <stop offset="45%" stopColor="#f2a7b8" stopOpacity="0.86" />
              <stop offset="100%" stopColor="#ffd3a6" stopOpacity="0.64" />
            </linearGradient>
          </defs>
          <path
            className={styles.routeGhost}
            d="M82 386 C188 252 303 424 430 278 C558 130 626 196 722 148 C822 98 868 214 930 80"
          />
          <path
            ref={routeRef}
            className={styles.routeMain}
            d="M82 386 C188 252 303 424 430 278 C558 130 626 196 722 148 C822 98 868 214 930 80"
          />
          <path className={styles.routeCross} d="M146 120 C292 186 344 154 480 224 C606 288 704 314 872 306" />
          <path className={styles.routeCross} d="M102 492 C260 498 360 454 502 430 C694 398 802 426 936 384" />
        </svg>

        {packetLabels.map((label, index) => (
          <div
            key={label}
            ref={(element) => {
              packetRefs.current[index] = element;
            }}
            className={styles.packetOrb}
            aria-hidden="true"
          >
            <span>{label}</span>
          </div>
        ))}

        {mediaSlots.map((slot) => (
          <figure
            key={slot.id}
            className={styles.mediaSlot}
            style={{ left: slot.position.left, top: slot.position.top }}
            data-pipeline-map-item
          >
            <div>
              <Image src={slot.src} alt="" fill sizes="(max-width: 640px) 150px, 220px" />
            </div>
            <figcaption>{slot.label}</figcaption>
          </figure>
        ))}

        {nodes.map((node, index) => {
          const Icon = node.Icon;
          const selected = index === activeIndex;

          return (
            <button
              key={node.id}
              type="button"
              className={styles.node}
              style={{ left: node.position.x, top: node.position.y }}
              data-active={selected ? "true" : undefined}
              data-node-id={node.id}
              data-pipeline-node
              onClick={() => setActiveNode(index)}
              aria-pressed={selected}
            >
              <span className={styles.nodePulse} aria-hidden="true" />
              <span className={styles.nodeIcon}>
                <Icon size={18} strokeWidth={1.7} />
              </span>
              <span className={styles.nodeCopy}>
                <span>{node.num}</span>
                <strong>{node.title}</strong>
              </span>
            </button>
          );
        })}

        <div className={styles.coordinateBlock} data-pipeline-map-item>
          <span>route field</span>
          <strong>video → claim → zone → payout</strong>
        </div>
      </div>

      <aside className={styles.receipt} data-pipeline-map-item data-pipeline-receipt>
        <div className={styles.receiptHead}>
          <span className={styles.receiptIcon}>
            <ActiveIcon size={20} strokeWidth={1.6} />
          </span>
          <div>
            <span>{active.eyebrow}</span>
            <strong>{active.title}</strong>
          </div>
          <span>{active.metric}</span>
        </div>

        <p>{active.body}</p>

        <div className={styles.receiptRows}>
          {active.rows.map(([label, value]) => (
            <div key={`${active.id}-${label}`}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className={styles.receiptFoot}>
          <FileSearch size={15} strokeWidth={1.6} />
          <span>scroll or swipe over the route to walk the proof forward</span>
          <BadgeCheck size={15} strokeWidth={1.6} />
        </div>
      </aside>
    </div>
  );
}
