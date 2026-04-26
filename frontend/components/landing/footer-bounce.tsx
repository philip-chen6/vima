"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const down = "M0 0 C0 0 464 156 1139 156 S2278 0 2278 0 V683 H0 V0 Z";
const center = "M0 0 C0 0 464 0 1139 0 S2278 0 2278 0 V683 H0 V0 Z";

export default function FooterBounce() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const path = pathRef.current;
    if (!root || !path) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      gsap.set(path, { attr: { d: center } });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(path, { attr: { d: center } });

      const trigger = ScrollTrigger.create({
        trigger: root,
        start: "top bottom",
        end: "bottom top",
        onEnter: (self) => {
          const velocity = Math.abs(self.getVelocity());
          const variation = gsap.utils.clamp(0.08, 0.42, velocity / 18000);

          gsap.fromTo(
            path,
            { attr: { d: down } },
            {
              attr: { d: center },
              duration: 1.65,
              ease: `elastic.out(${1 + variation}, ${0.74 - variation * 0.55})`,
              overwrite: true,
            },
          );
        },
        onEnterBack: (self) => {
          const velocity = Math.abs(self.getVelocity());
          const variation = gsap.utils.clamp(0.08, 0.36, velocity / 22000);

          gsap.fromTo(
            path,
            { attr: { d: down } },
            {
              attr: { d: center },
              duration: 1.4,
              ease: `elastic.out(${1 + variation}, ${0.78 - variation * 0.5})`,
              overwrite: true,
            },
          );
        },
      });

      return () => trigger.kill();
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="landing-footer-bounce"
      aria-hidden
      style={{
        position: "absolute",
        inset: "clamp(140px, 21vw, 268px) 0 auto",
        height: "clamp(100px, 14vw, 180px)",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <svg
        preserveAspectRatio="none"
        viewBox="0 0 2278 683"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          overflow: "visible",
        }}
      >
        <defs>
          <linearGradient id="vima-footer-bounce-grad" x1="0" y1="0" x2="2278" y2="683" gradientUnits="userSpaceOnUse">
            <stop offset="0.18" stopColor="rgba(106,30,85,0.18)" />
            <stop offset="0.54" stopColor="rgba(166,77,121,0.34)" />
            <stop offset="0.86" stopColor="rgba(242,167,184,0.14)" />
          </linearGradient>
        </defs>
        <path ref={pathRef} fill="url(#vima-footer-bounce-grad)" d={center} />
      </svg>
    </div>
  );
}
