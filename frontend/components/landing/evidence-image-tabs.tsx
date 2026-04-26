"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { Flip } from "gsap/Flip";

gsap.registerPlugin(CustomEase, Flip);

const tabs = [
  {
    key: "frame",
    num: "01",
    title: "depth evidence",
    metric: "frame 03",
    image: "/figures/frame-03-depth-comparison.jpg",
    alt: "side by side hardhat video frame and depth map from the vima masonry run",
    body: "each bodycam frame gets paired with model depth before it can become a spatial work claim.",
    rows: [
      ["source", "bodycam video"],
      ["signal", "depth map"],
      ["audit", "visual check"],
    ],
  },
  {
    key: "label",
    num: "02",
    title: "work label",
    metric: "0.939 mean P",
    image: "/figures/fig_pipeline.png",
    alt: "vima pipeline diagram showing evidence flowing into classification and reward logic",
    body: "the judge turns each frame into productive, contributory, or non-contributory work claims with confidence attached.",
    rows: [
      ["P", "productive"],
      ["C", "contributory"],
      ["NC", "non-contributory"],
    ],
  },
  {
    key: "zone",
    num: "03",
    title: "zone anchor",
    metric: "3 zones",
    image: "/figures/exp_i_zone_segmentation.png",
    alt: "zone attribution figure showing spatial segmentation and frame placement",
    body: "COLMAP attribution pins every claim to a site zone, so the evidence chain stays spatial instead of just chronological.",
    rows: [
      ["zone a", "masonry face"],
      ["zone b", "scaffold edge"],
      ["zone c", "material lane"],
    ],
  },
  {
    key: "settle",
    num: "04",
    title: "settlement gate",
    metric: "86.7% wrench",
    image: "/figures/architecture.png",
    alt: "architecture diagram for local evidence-anchored spatial memory",
    body: "only verified productive time moves forward into the SPL reward path, with the frame trail still visible behind it.",
    rows: [
      ["eligible", "26 / 30"],
      ["weight", "wrench time"],
      ["output", "SPL payout"],
    ],
  },
];

export default function EvidenceImageTabs() {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const cleanups: Array<() => void> = [];

    const ctx = gsap.context(() => {
      CustomEase.create("vima-evidence-tabs", "0.625, 0.05, 0, 1");

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const buttons = gsap.utils.toArray<HTMLButtonElement>("[data-evidence-tab-button]");
      const panels = gsap.utils.toArray<HTMLElement>("[data-evidence-tab-panel]");
      const visuals = gsap.utils.toArray<HTMLElement>("[data-evidence-tab-visual]");
      const indicator = root.querySelector<HTMLElement>("[data-evidence-tab-bg]");

      if (!buttons.length || !panels.length || !visuals.length || !indicator) return;

      let activeIndex = 0;
      let activeTween: gsap.core.Timeline | undefined;

      const moveIndicator = (button: HTMLElement) => {
        const state = Flip.getState(indicator);
        button.appendChild(indicator);
        Flip.from(state, {
          duration: reduce ? 0 : 0.42,
          ease: "vima-evidence-tabs",
          absolute: true,
        });
      };

      const setActiveState = (index: number) => {
        buttons.forEach((button, buttonIndex) => {
          const selected = buttonIndex === index;
          button.classList.toggle("active", selected);
          button.setAttribute("aria-selected", selected ? "true" : "false");
          button.tabIndex = selected ? 0 : -1;
        });

        panels.forEach((panel, panelIndex) => {
          const selected = panelIndex === index;
          panel.classList.toggle("active", selected);
          panel.setAttribute("aria-hidden", selected ? "false" : "true");
        });

        visuals.forEach((visual, visualIndex) => {
          const selected = visualIndex === index;
          visual.classList.toggle("active", selected);
          visual.setAttribute("aria-hidden", selected ? "false" : "true");
        });
      };

      const switchTab = (index: number, initial = false) => {
        if (!initial && index === activeIndex) return;

        const previousIndex = activeIndex;
        const outgoingPanel = panels[previousIndex];
        const outgoingVisual = visuals[previousIndex];
        const incomingPanel = panels[index];
        const incomingVisual = visuals[index];
        const incomingButton = buttons[index];

        if (!incomingPanel || !incomingVisual || !incomingButton) return;

        activeTween?.kill();
        activeIndex = index;
        incomingPanel.classList.add("active");
        incomingVisual.classList.add("active");
        moveIndicator(incomingButton);
        setActiveState(index);

        if (reduce || initial) {
          gsap.set(panels, { autoAlpha: 0, y: 0 });
          gsap.set(visuals, { autoAlpha: 0, xPercent: 0, scale: 1 });
          gsap.set(incomingPanel, { autoAlpha: 1 });
          gsap.set(incomingVisual, { autoAlpha: 1 });
          return;
        }

        const outgoingLines = outgoingPanel?.querySelectorAll("[data-evidence-tab-fade]") ?? [];
        const incomingLines = incomingPanel.querySelectorAll("[data-evidence-tab-fade]");

        activeTween = gsap
          .timeline({
            defaults: { ease: "power3.inOut", duration: 0.42 },
            onComplete: () => {
              outgoingPanel?.classList.remove("active");
              outgoingVisual?.classList.remove("active");
              outgoingPanel?.setAttribute("aria-hidden", "true");
              outgoingVisual?.setAttribute("aria-hidden", "true");
              activeTween = undefined;
            },
          })
          .to(outgoingLines, { y: "-0.9em", autoAlpha: 0, stagger: 0.025 }, 0)
          .to(outgoingVisual, { autoAlpha: 0, xPercent: 2, scale: 0.992 }, 0)
          .fromTo(
            incomingLines,
            { y: "1em", autoAlpha: 0 },
            { y: "0em", autoAlpha: 1, stagger: 0.04, duration: 0.52 },
            0.18,
          )
          .fromTo(
            incomingVisual,
            { autoAlpha: 0, xPercent: -2, scale: 1.008 },
            { autoAlpha: 1, xPercent: 0, scale: 1, duration: 0.56 },
            "<",
          );
      };

      buttons.forEach((button, index) => {
        const onPointerDown = () => switchTab(index);
        const onClick = () => switchTab(index);
        const onKeyDown = (event: KeyboardEvent) => {
          if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) return;

          event.preventDefault();
          const nextIndex =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? buttons.length - 1
                : event.key === "ArrowLeft" || event.key === "ArrowUp"
                  ? (activeIndex - 1 + buttons.length) % buttons.length
                  : (activeIndex + 1) % buttons.length;

          switchTab(nextIndex);
          buttons[nextIndex]?.focus();
        };

        button.addEventListener("pointerdown", onPointerDown);
        button.addEventListener("click", onClick);
        button.addEventListener("keydown", onKeyDown);

        cleanups.push(() => {
          button.removeEventListener("pointerdown", onPointerDown);
          button.removeEventListener("click", onClick);
          button.removeEventListener("keydown", onKeyDown);
        });
      });

      switchTab(0, true);
    }, root);

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      ctx.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className="evidence-image-tabs" data-evidence-image-tabs>
      <div className="evidence-tabs-copy">
        <div className="evidence-atlas-label">
          <span>proof rail</span>
          <span>frame / claim / zone / payout</span>
        </div>
        <div className="evidence-tabs-nav" role="tablist" aria-label="evidence chain views">
          {tabs.map((tab, index) => (
            <button
              key={tab.key}
              type="button"
              className={`evidence-tab-button${index === 0 ? " active" : ""}`}
              data-evidence-tab-button
              role="tab"
              aria-selected={index === 0 ? "true" : "false"}
              aria-controls={`evidence-tab-panel-${tab.key}`}
              id={`evidence-tab-button-${tab.key}`}
              tabIndex={index === 0 ? 0 : -1}
            >
              <span className="evidence-tab-num">{tab.num}</span>
              <span className="evidence-tab-title">{tab.title}</span>
              <span className="evidence-tab-metric">{tab.metric}</span>
              {index === 0 && <span data-evidence-tab-bg className="evidence-tab-bg" />}
            </button>
          ))}
        </div>

      </div>

      <div className="evidence-chain-spine" aria-hidden="true">
        {tabs.map((tab) => (
          <span key={tab.key} />
        ))}
      </div>

      <div className="evidence-tabs-media" aria-live="polite">
        <div className="evidence-tabs-media-head">
          <span>image evidence</span>
          <span>interactive chain</span>
        </div>
        <div className="evidence-tabs-image-stage">
          {tabs.map((tab, index) => (
            <figure
              key={tab.key}
              className={`evidence-tab-visual${index === 0 ? " active" : ""}`}
              data-evidence-tab-visual
              aria-hidden={index === 0 ? "false" : "true"}
            >
              <div className="evidence-tab-image-frame" style={{ position: "relative" }}>
                <Image
                  src={tab.image}
                  alt={tab.alt}
                  fill
                  sizes="(max-width: 980px) 100vw, 62vw"
                  priority={index === 0}
                />
              </div>
              <figcaption>
                <span>
                  {tab.num} · {tab.title}
                </span>
                <span>{tab.metric}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="evidence-tab-panel-wrap">
          {tabs.map((tab, index) => (
            <div
              key={tab.key}
              id={`evidence-tab-panel-${tab.key}`}
              className={`evidence-tab-panel${index === 0 ? " active" : ""}`}
              data-evidence-tab-panel
              role="tabpanel"
              aria-hidden={index === 0 ? "false" : "true"}
              aria-labelledby={`evidence-tab-button-${tab.key}`}
            >
              <div data-evidence-tab-fade className="evidence-tab-eyebrow">
                {tab.num} · {tab.title}
              </div>
              <h3 data-evidence-tab-fade>{tab.body}</h3>
              <div data-evidence-tab-fade className="evidence-tab-rows">
                {tab.rows.map(([label, value]) => (
                  <div key={`${tab.key}-${label}`}>
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
