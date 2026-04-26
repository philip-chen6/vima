"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { BadgeCheck, Camera, Coins, MapPinned, ScanLine } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./layered-proof-stack.module.css";

gsap.registerPlugin(ScrollTrigger);

const layers = [
  {
    id: "frame",
    num: "01",
    label: "bodycam frame",
    title: "frame evidence enters first.",
    body: "raw site video stays visible as the claim moves through the stack.",
    metric: "30 frames",
    side: "left",
    image: "/figures/fig_temporal_timeline.png",
    Icon: Camera,
    rows: [
      ["source", "hardhat video"],
      ["sample", "00.0s to 18.4s"],
      ["state", "unsettled"],
    ],
  },
  {
    id: "cii",
    num: "02",
    label: "CII judgement",
    title: "productive time gets classified.",
    body: "each sampled frame carries the category, confidence, and audit trail needed for review.",
    metric: "0.939 mean P",
    side: "right",
    image: "/figures/architecture.png",
    Icon: ScanLine,
    rows: [
      ["productive", "26 / 30"],
      ["context", "3 / 30"],
      ["blocked", "1 / 30"],
    ],
  },
  {
    id: "zone",
    num: "03",
    label: "zone anchor",
    title: "work claims land in space.",
    body: "COLMAP attribution binds the claim to a site zone instead of a detached spreadsheet row.",
    metric: "3 zones",
    side: "left",
    image: "/figures/exp_i_zone_segmentation.png",
    Icon: MapPinned,
    rows: [
      ["zone a", "block alignment"],
      ["zone b", "material staging"],
      ["zone c", "site setup"],
    ],
  },
  {
    id: "settle",
    num: "04",
    label: "settlement gate",
    title: "the receipt only moves when proof holds.",
    body: "verified productive time becomes the SPL payout basis while the original evidence remains inspectable.",
    metric: "86.7% wrench",
    side: "right",
    image: "/figures/fig_temporal_timeline.png",
    Icon: Coins,
    rows: [
      ["weight", "0.867"],
      ["basis", "wrench time"],
      ["status", "ready"],
    ],
  },
  {
    id: "loop",
    num: "01",
    label: "bodycam frame",
    title: "then the next frame starts the loop.",
    body: "the stack resolves back into evidence, matching the infinite reference without hijacking the whole page.",
    metric: "next frame",
    side: "left",
    image: "/figures/fig_temporal_timeline.png",
    Icon: BadgeCheck,
    rows: [
      ["receipt", "cii:30"],
      ["map", "colmap:3"],
      ["settle", "spl:ready"],
    ],
  },
];

export default function LayeredProofStack() {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    root.setAttribute("data-layer-ready", "gsap");
    const mm = gsap.matchMedia();

    mm.add(
      {
        reduce: "(prefers-reduced-motion: reduce)",
        desktop: "(min-width: 760px)",
      },
      (context) => {
        const conditions = context.conditions as { reduce?: boolean; desktop?: boolean };
        const reduce = Boolean(conditions.reduce);
        const desktop = Boolean(conditions.desktop);

        const ctx = gsap.context(() => {
          const panels = gsap.utils.toArray<HTMLElement>("[data-layer-panel]");
          const triggers: ScrollTrigger[] = [];

          gsap.set(panels, {
            zIndex: (index) => index + 1,
          });

          panels.forEach((panel, index) => {
            const inner = panel.querySelector<HTMLElement>("[data-layer-inner]");
            const media = panel.querySelector<HTMLElement>("[data-layer-media]");
            const rail = panel.querySelector<HTMLElement>("[data-layer-rail]");

            if (!reduce && desktop) {
              triggers.push(
                ScrollTrigger.create({
                  trigger: panel,
                  start: "top top",
                  end: "bottom top",
                  pin: panel,
                  pinSpacing: false,
                  anticipatePin: 1,
                  refreshPriority: index,
                }),
              );

              if (inner) {
                gsap.fromTo(
                  inner,
                  { autoAlpha: 0.72, y: 34, scale: 0.985 },
                  {
                    autoAlpha: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.7,
                    ease: "power3.out",
                    scrollTrigger: {
                      trigger: panel,
                      start: "top 72%",
                      end: "top 28%",
                      scrub: 0.55,
                    },
                  },
                );
              }

              if (media) {
                gsap.fromTo(
                  media,
                  { yPercent: 7 },
                  {
                    yPercent: -5,
                    ease: "none",
                    scrollTrigger: {
                      trigger: panel,
                      start: "top bottom",
                      end: "bottom top",
                      scrub: true,
                    },
                  },
                );
              }

              if (rail) {
                gsap.fromTo(
                  rail,
                  { scaleY: 0.12, transformOrigin: "top" },
                  {
                    scaleY: 1,
                    ease: "none",
                    scrollTrigger: {
                      trigger: panel,
                      start: "top 74%",
                      end: "bottom 46%",
                      scrub: true,
                    },
                  },
                );
              }
            } else {
              gsap.set([inner, media, rail], { clearProps: "all" });
            }
          });

          return () => {
            triggers.forEach((trigger) => trigger.kill());
          };
        }, root);

        return () => ctx.revert();
      },
    );

    return () => {
      root.removeAttribute("data-layer-ready");
      mm.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stack} aria-label="layered proof scroll stack">
      {layers.map((layer, index) => {
        const Icon = layer.Icon;

        return (
          <article
            key={`${layer.id}-${index}`}
            className={styles.panel}
            data-layer-panel
            data-side={layer.side}
            data-loop={layer.id === "loop" ? "true" : "false"}
          >
            <div className={styles.panelInner} data-layer-inner>
              <div className={styles.copy}>
                <div className={styles.kicker}>
                  <span>{layer.num}</span>
                  <span>{layer.label}</span>
                </div>
                <h3>{layer.title}</h3>
                <p>{layer.body}</p>
                <div className={styles.metric}>
                  <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
                  <strong>{layer.metric}</strong>
                </div>
              </div>

              <figure className={styles.media} data-layer-media>
                <Image src={layer.image} alt="" fill sizes="(max-width: 760px) 100vw, 46vw" priority={index === 0} />
                <figcaption>{layer.label}</figcaption>
              </figure>

              <div className={styles.dataRail}>
                <div className={styles.railLine} data-layer-rail />
                {layer.rows.map(([key, value]) => (
                  <div key={key} className={styles.row}>
                    <span>{key}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              <div className={styles.hotLine} aria-hidden="true" />
            </div>
          </article>
        );
      })}
    </div>
  );
}
