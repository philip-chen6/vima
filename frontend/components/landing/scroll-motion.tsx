"use client";

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, ScrollToPlugin, SplitText);

const LOADER_COMPLETE_EVENT = "vima-loader-complete";
const PROGRAMMATIC_SCROLL_START = "vima-programmatic-scroll:start";
const PROGRAMMATIC_SCROLL_END = "vima-programmatic-scroll:end";
const HASH_SCROLL_DURATION = 1.28;
const HASH_SCROLL_EASE = "power2.inOut";
const HASH_SCROLL_OFFSET = 92;

type ScrollMotionProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export default function ScrollMotion({ children, className, style }: ScrollMotionProps) {
  const rootRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        reduce: "(prefers-reduced-motion: reduce)",
        finePointer: "(pointer: fine)",
        compact: "(max-width: 680px)",
      },
      (context) => {
        const ctx = gsap.context(() => {
          const conditions = context.conditions as { compact?: boolean; reduce?: boolean; finePointer?: boolean };
          const animated = gsap.utils.toArray<HTMLElement>("[data-gsap]");
          const progressBar = progressRef.current;
          const cleanups: Array<() => void> = [];
          const titleSplits: Array<{ revert: () => void }> = [];
          const runWhenProgrammaticScrollSettles = (callback: () => void) => {
            if (document.documentElement.getAttribute("data-programmatic-scroll") !== "true") {
              callback();
              return;
            }

            let cleanup = () => {};
            const onSettled = () => {
              cleanup();
              window.requestAnimationFrame(callback);
            };

            cleanup = () => window.removeEventListener(PROGRAMMATIC_SCROLL_END, onSettled);
            window.addEventListener(PROGRAMMATIC_SCROLL_END, onSettled, { once: true });
            cleanups.push(cleanup);
          };

          const scrollToHash = (hash: string) => {
            if (!hash.startsWith("#") || hash.length < 2) return false;

            const target = document.querySelector(hash);
            if (!target) return false;
            const smoother = ScrollSmoother.get();
            const duration = conditions.reduce ? 0.01 : HASH_SCROLL_DURATION;
            let settled = false;
            const releaseProgrammaticScroll = () => {
              if (settled) return;
              settled = true;
              document.documentElement.removeAttribute("data-programmatic-scroll");
              window.dispatchEvent(new CustomEvent(PROGRAMMATIC_SCROLL_END));
            };

            document.documentElement.setAttribute("data-programmatic-scroll", "true");
            window.dispatchEvent(new CustomEvent(PROGRAMMATIC_SCROLL_START));

            if (smoother) {
              gsap.killTweensOf(smoother);
              if (conditions.reduce) {
                smoother.scrollTo(target, false, `top ${HASH_SCROLL_OFFSET}px`);
                releaseProgrammaticScroll();
              } else {
                const y = gsap.utils.clamp(
                  0,
                  ScrollTrigger.maxScroll(window),
                  smoother.offset(target, `top ${HASH_SCROLL_OFFSET}px`),
                );

                gsap.to(smoother, {
                  duration,
                  scrollTop: y,
                  ease: HASH_SCROLL_EASE,
                  overwrite: "auto",
                  onComplete: releaseProgrammaticScroll,
                });
              }
            } else {
              gsap.to(window, {
                duration,
                scrollTo: {
                  y: target,
                  offsetY: HASH_SCROLL_OFFSET,
                  autoKill: true,
                },
                ease: conditions.reduce ? "none" : HASH_SCROLL_EASE,
                onComplete: releaseProgrammaticScroll,
              });
            }

            const fallback = window.setTimeout(releaseProgrammaticScroll, conditions.reduce ? 50 : duration * 1000 + 260);
            cleanups.push(() => window.clearTimeout(fallback));
            window.history.pushState(null, "", hash);
            return true;
          };

          const onAnchorClick = (event: MouseEvent) => {
            if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href^='#']");
            if (!anchor) return;

            if (scrollToHash(anchor.hash)) {
              event.preventDefault();
            }
          };

          root.addEventListener("click", onAnchorClick);
          cleanups.push(() => root.removeEventListener("click", onAnchorClick));
          const intro = (name: string) =>
            Array.from(document.querySelectorAll<HTMLElement>(`[data-gsap-intro="${name}"]`));
          const introTargets = Array.from(document.querySelectorAll<HTMLElement>("[data-gsap-intro]"));
          const childrenOf = (targets: HTMLElement[]) =>
            targets.flatMap((target) => Array.from(target.children).filter((child): child is HTMLElement => child instanceof HTMLElement));
          const logoGlyphs = intro("intro-logo-wordmark").flatMap((target) => {
            const glyphRoot = target.firstElementChild;
            if (!(glyphRoot instanceof HTMLElement)) return [];
            return Array.from(glyphRoot.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
          });

          if (conditions.reduce) {
            gsap.set([...animated, ...introTargets], { autoAlpha: 1, clearProps: "transform,clipPath" });
            if (progressBar) {
              gsap.set(progressBar, { scaleX: 0, transformOrigin: "0% 50%" });
              const updateProgress = () => {
                const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
                gsap.set(progressBar, { scaleX: gsap.utils.clamp(0, 1, window.scrollY / maxScroll) });
              };

              updateProgress();
              window.addEventListener("scroll", updateProgress, { passive: true });
              cleanups.push(() => window.removeEventListener("scroll", updateProgress));
            }

            return () => {
              cleanups.forEach((cleanup) => cleanup());
            };
          }

          ScrollSmoother.get()?.kill();
          const smoother = ScrollSmoother.create({
            wrapper: "#smooth-wrapper",
            content: "#smooth-content",
            smooth: 0.58,
            speed: 1,
            effects: true,
            smoothTouch: false,
          });

          cleanups.push(() => smoother.kill());

          const landingBackdrop = document.querySelector<HTMLElement>("[data-landing-backdrop]");
          if (landingBackdrop) {
            gsap.set(landingBackdrop, { autoAlpha: 1 });
            const backdropFade = gsap.to(landingBackdrop, {
              opacity: 0,
              ease: "none",
              scrollTrigger: {
                trigger: "#top",
                start: "65% top",
                end: "bottom top",
                scrub: 0.65,
              },
            });

            cleanups.push(() => backdropFade.kill());
          }

          if (progressBar) {
            gsap.set(progressBar, { scaleX: 0, transformOrigin: "0% 50%" });
            const progressTo = gsap.quickTo(progressBar, "scaleX", { duration: 0.18, ease: "power2.out" });
            const progressTrigger = ScrollTrigger.create({
              start: 0,
              end: "max",
              onUpdate: (self) => progressTo(self.progress),
            });

            cleanups.push(() => progressTrigger.kill());
          }

          gsap.set(animated, { willChange: "transform,opacity" });
          gsap.set(introTargets, { willChange: "transform,opacity,clip-path" });
          gsap.set("#top", { perspective: 1100 });

          const introBg = intro("intro-bg");
          const introGrid = intro("intro-grid");
          const introNav = intro("intro-nav");
          const introNavBrand = intro("intro-nav-brand");
          const introNavLinks = childrenOf(intro("intro-nav-links"));
          const introNavActions = childrenOf(intro("intro-nav-actions"));
          const introEyebrow = intro("intro-eyebrow");
          const introLogoMark = intro("intro-logo-mark");
          const introLogoWordmark = intro("intro-logo-wordmark");
          const introLogoGlyphs = logoGlyphs.length > 0 ? logoGlyphs : introLogoWordmark;
          const introCopyPrimary = intro("intro-copy-primary");
          const introCopySecondary = intro("intro-copy-secondary");
          const introPipeline = intro("intro-pipeline");
          const introCtaPrimary = intro("intro-cta-primary");
          const introCtaSecondary = intro("intro-cta-secondary");
          const introMeta = intro("intro-meta");
          const introMetaChildren = childrenOf(introMeta);
          const introScrollTrace = intro("intro-scroll-trace");
          const introTextSplits: Array<{ revert: () => void }> = [];
          const splitIntroLines = (targets: HTMLElement[]) =>
            targets.flatMap((target) => {
              const split = SplitText.create(target, {
                type: "words,lines",
                linesClass: "vima-split-line",
                mask: "lines",
                aria: "auto",
              });

              introTextSplits.push(split);
              return split.lines.filter((line): line is HTMLElement => line instanceof HTMLElement);
            });
          const introEyebrowLines = splitIntroLines(introEyebrow);
          const introCopyPrimaryLines = splitIntroLines(introCopyPrimary);
          const introCopySecondaryLines = splitIntroLines(introCopySecondary);
          const introPipelineLines = splitIntroLines(introPipeline);
          const introEyebrowReveal = introEyebrowLines.length > 0 ? introEyebrowLines : introEyebrow;
          const introCopyPrimaryReveal = introCopyPrimaryLines.length > 0 ? introCopyPrimaryLines : introCopyPrimary;
          const introCopySecondaryReveal = introCopySecondaryLines.length > 0 ? introCopySecondaryLines : introCopySecondary;
          const introPipelineReveal = introPipelineLines.length > 0 ? introPipelineLines : introPipeline;
          const introCopyTargets = [...introEyebrow, ...introCopyPrimary, ...introCopySecondary, ...introPipeline];
          const introCopyRevealTargets = [
            ...introEyebrowReveal,
            ...introCopyPrimaryReveal,
            ...introCopySecondaryReveal,
            ...introPipelineReveal,
          ];
          const introMaskedLines = [...introEyebrowLines, ...introCopyPrimaryLines, ...introCopySecondaryLines, ...introPipelineLines];

          gsap.set(introBg, { autoAlpha: 1, scale: 1, transformOrigin: "50% 42%" });
          gsap.set(introGrid, {
            autoAlpha: 0,
            scaleX: 0.84,
            transformOrigin: "0% 50%",
            clipPath: "inset(0 100% 0 0)",
          });
          gsap.set(introNav, {
            autoAlpha: 0,
            y: -140,
            scaleY: 0.98,
            transformOrigin: "50% 0%",
          });
          gsap.set(introNavBrand, { autoAlpha: 0, x: -18 });
          gsap.set(introNavLinks, { autoAlpha: 0, y: -10, rotationX: -12, transformOrigin: "50% 100%" });
          gsap.set(introNavActions, { autoAlpha: 0, x: 18 });
          gsap.set(introEyebrow, { autoAlpha: 1, x: 0, clipPath: "none" });
          gsap.set(introLogoMark, {
            autoAlpha: 0,
            x: -42,
            scale: 0.9,
            rotationY: -18,
            transformOrigin: "50% 50%",
          });
          gsap.set(introLogoWordmark, { autoAlpha: 1, transformOrigin: "0% 58%" });
          gsap.set(introLogoGlyphs, { autoAlpha: 0, yPercent: 112, rotationX: -16, transformOrigin: "50% 100%" });
          gsap.set(introCopyTargets, { autoAlpha: 1, x: 0, y: 0, clipPath: "none" });
          gsap.set(introCopyRevealTargets, {
            autoAlpha: 0,
            yPercent: 100,
            willChange: "transform,opacity",
          });
          gsap.set(introCtaPrimary, { autoAlpha: 0, x: -30, y: 18, scale: 0.96, willChange: "transform,opacity" });
          gsap.set(introCtaSecondary, { autoAlpha: 0, x: 30, y: 18, scale: 0.96, willChange: "transform,opacity" });
          gsap.set(introLogoMark, { willChange: "transform,filter,opacity" });
          gsap.set(introMeta, { autoAlpha: 0, y: 18, scaleX: 0.94, transformOrigin: "0% 50%", willChange: "transform,opacity" });
          gsap.set(introMetaChildren, { autoAlpha: 0, y: 10 });
          gsap.set(introScrollTrace, { autoAlpha: 0, y: -6 });

          const introTl = gsap
            .timeline({
              paused: true,
              defaults: { ease: "power3.out", duration: 0.52 },
            })
            .addLabel("hero:bg", 0)
            .to(introBg, { autoAlpha: 1, scale: 1, duration: 0.01, ease: "none" }, "hero:bg")
            .to(
              introGrid,
              { autoAlpha: 1, scaleX: 1, clipPath: "inset(0 0% 0 0)", duration: 1.08 },
              "hero:bg+=0.08",
            )
            .addLabel("hero:metal", "hero:bg+=0.26")
            .to(
              introLogoMark,
              { autoAlpha: 1, x: 0, scale: 1, rotationY: 0, duration: 1.18, ease: "power4.out" },
              "hero:metal",
            )
            .to(
              introLogoGlyphs,
              { autoAlpha: 1, yPercent: 0, rotationX: 0, stagger: 0.045, duration: 0.96, ease: "expo.out" },
              "hero:metal+=0.16",
            )
            .to(
              introLogoMark,
              { filter: "drop-shadow(0 0 22px rgba(242,167,184,0.20))", duration: 0.18, ease: "power2.out" },
              "hero:metal+=0.72",
            )
            .to(introLogoMark, { filter: "drop-shadow(0 0 0 rgba(242,167,184,0))", duration: 0.42 }, "hero:metal+=0.9")
            .addLabel("hero:large-text", "hero:metal+=0.82")
            .to(
              introCopyPrimaryReveal,
              { autoAlpha: 1, yPercent: 0, opacity: 1, stagger: 0.1, duration: 0.72, ease: "expo.out" },
              "hero:large-text",
            )
            .addLabel("hero:small-text", "hero:large-text+=0.36")
            .to(
              introEyebrowReveal,
              { autoAlpha: 1, yPercent: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: "expo.out" },
              "hero:small-text",
            )
            .to(
              introCopySecondaryReveal,
              { autoAlpha: 1, yPercent: 0, opacity: 1, stagger: 0.1, duration: 0.68, ease: "expo.out" },
              "hero:small-text+=0.16",
            )
            .to(
              introPipelineReveal,
              { autoAlpha: 1, yPercent: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: "expo.out" },
              "hero:small-text+=0.34",
            )
            .addLabel("hero:cta", "hero:small-text+=0.62")
            .to(introCtaPrimary, { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 0.78 }, "hero:cta")
            .to(introCtaSecondary, { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 0.78 }, "hero:cta+=0.08")
            .addLabel("hero:meta", "hero:cta+=0.32")
            .to(introMeta, { autoAlpha: 1, y: 0, scaleX: 1, duration: 0.68 }, "hero:meta")
            .to(introMetaChildren, { autoAlpha: 1, y: 0, stagger: 0.06, duration: 0.52 }, "hero:meta+=0.12")
            .addLabel("hero:scroll", "hero:meta+=0.28")
            .to(introScrollTrace, { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.68 }, "hero:scroll")
            // navbar moved earlier — appears alongside the small text reveals
            // so the page reads as "navigable" the moment the hero settles in,
            // not 3-4 seconds after.
            .addLabel("hero:nav", "hero:small-text+=0.1")
            .to(introNav, { autoAlpha: 1, y: 0, scaleY: 1, duration: 0.9, ease: "expo.out" }, "hero:nav")
            .to(introNavBrand, { autoAlpha: 1, x: 0, duration: 0.6 }, "hero:nav+=0.12")
            .to(
              introNavLinks,
              { autoAlpha: 1, y: 0, rotationX: 0, stagger: 0.05, duration: 0.6 },
              "hero:nav+=0.18",
            )
            .to(introNavActions, { autoAlpha: 1, x: 0, stagger: 0.06, duration: 0.6 }, "hero:nav+=0.28")
            .set([...introTargets, ...introLogoGlyphs, ...introMaskedLines], { clearProps: "willChange" });

          introTl.timeScale(conditions.compact || !conditions.finePointer ? 1.05 : 0.72);

          const playIntroTimeline = () => {
            if (introTl.progress() === 0) {
              introTl.play(0);
            }
          };

          if ((window as Window & { __vimaLoaderComplete?: boolean }).__vimaLoaderComplete) {
            playIntroTimeline();
          } else {
            window.addEventListener(LOADER_COMPLETE_EVENT, playIntroTimeline, { once: true });
            cleanups.push(() => window.removeEventListener(LOADER_COMPLETE_EVENT, playIntroTimeline));

            if ((window as Window & { __vimaLoaderComplete?: boolean }).__vimaLoaderComplete) {
              playIntroTimeline();
            }
          }

          cleanups.push(() => {
            introTl.kill();
            introTextSplits.forEach((split) => split.revert());
          });

          const setupMaskedTitleReveals = () => {
            const titles = gsap.utils.toArray<HTMLElement>("[data-gsap='section-title']");

            titles.forEach((title) => {
              let trigger: ScrollTrigger | undefined;

              if (title.querySelector("[data-gradient-text]")) {
                gsap.set(title, {
                  autoAlpha: 0,
                  y: 46,
                  clipPath: "inset(0 0 100% 0)",
                  willChange: "transform,opacity,clip-path",
                });

                trigger = ScrollTrigger.create({
                  trigger: title,
                  start: "top 82%",
                  once: true,
                  onEnter: () => {
                    runWhenProgrammaticScrollSettles(() => {
                      gsap.to(title, {
                        autoAlpha: 1,
                        y: 0,
                        clipPath: "inset(0 0 0% 0)",
                        duration: 0.72,
                        ease: "expo.out",
                        onComplete: () => gsap.set(title, { clearProps: "willChange" }),
                      });
                    });
                  },
                });

                cleanups.push(() => trigger?.kill());
                return;
              }

              gsap.set(title, { autoAlpha: 0 });

              const split = SplitText.create(title, {
                type: "lines",
                linesClass: "vima-split-line",
                mask: "lines",
                aria: "auto",
                onSplit(self) {
                  trigger?.kill();
                  gsap.set(title, { autoAlpha: 1 });
                  gsap.set(self.lines, {
                    yPercent: 110,
                    autoAlpha: 0,
                    willChange: "transform,opacity",
                  });

                  const tween = gsap.to(self.lines, {
                    paused: true,
                    duration: 0.74,
                    yPercent: 0,
                    autoAlpha: 1,
                    stagger: 0.085,
                    ease: "expo.out",
                    onComplete: () => gsap.set(self.lines, { clearProps: "willChange" }),
                  });

                  trigger = ScrollTrigger.create({
                    trigger: title,
                    start: "top 82%",
                    once: true,
                    onEnter: () => runWhenProgrammaticScrollSettles(() => tween.play(0)),
                  });

                  return tween;
                },
              });

              titleSplits.push(split);
              cleanups.push(() => trigger?.kill());
            });
          };

          let cancelledTitleSetup = false;
          const fontsReady = document.fonts?.ready ?? Promise.resolve();

          void fontsReady.then(() => {
            if (!cancelledTitleSetup) {
              setupMaskedTitleReveals();
            }
          });

          cleanups.push(() => {
            cancelledTitleSetup = true;
            titleSplits.forEach((split) => split.revert());
          });

          gsap.set("[data-gsap='section-kicker']", {
            autoAlpha: 0,
            x: -24,
            clipPath: "inset(0 100% 0 0)",
          });
          ScrollTrigger.batch("[data-gsap='section-kicker']", {
            start: "top 84%",
            once: true,
            onEnter: (batch) => {
              runWhenProgrammaticScrollSettles(() => {
                gsap.to(batch, {
                  autoAlpha: 1,
                  x: 0,
                  clipPath: "inset(0 0% 0 0)",
                  stagger: 0.06,
                  duration: 0.44,
                  ease: "power3.out",
                  overwrite: true,
                });
              });
            },
          });

          gsap.set("[data-gsap='section-copy']", { autoAlpha: 0, x: 30, y: 10 });
          ScrollTrigger.batch("[data-gsap='section-copy']", {
            start: "top 84%",
            once: true,
            onEnter: (batch) => {
              runWhenProgrammaticScrollSettles(() => {
                gsap.to(batch, {
                  autoAlpha: 1,
                  x: 0,
                  y: 0,
                  stagger: 0.08,
                  duration: 0.52,
                  ease: "power3.out",
                  overwrite: true,
                });
              });
            },
          });

          const statCells = gsap.utils.toArray<HTMLElement>("[data-gsap='stat-cell']");
          gsap.set(statCells, {
            autoAlpha: 0,
            y: 34,
            scaleY: 0.84,
            transformOrigin: "50% 100%",
          });
          gsap.set(statCells.map((cell) => cell.firstElementChild), { x: -10, autoAlpha: 0 });
          ScrollTrigger.batch("[data-gsap='stat-cell']", {
            start: "top 86%",
            once: true,
            onEnter: (batch) => {
              runWhenProgrammaticScrollSettles(() => {
                gsap
                  .timeline({ defaults: { ease: "power3.out" } })
                  .to(batch, {
                    autoAlpha: 1,
                    y: 0,
                    scaleY: 1,
                    stagger: { each: 0.055, from: "edges" },
                    duration: 0.5,
                    overwrite: true,
                  })
                  .to(batch.map((cell) => cell.firstElementChild), { x: 0, autoAlpha: 1, stagger: 0.04, duration: 0.26 }, "<0.12");
              });
            },
          });

          gsap.set("[data-gsap='ledger-panel']", {
            autoAlpha: 0,
            y: 38,
            clipPath: "inset(0 0 100% 0)",
          });
          ScrollTrigger.batch("[data-gsap='ledger-panel']", {
            start: "top 82%",
            once: true,
            onEnter: (batch) => {
              runWhenProgrammaticScrollSettles(() => {
                gsap.to(batch, {
                  autoAlpha: 1,
                  y: 0,
                  clipPath: "inset(0 0 0% 0)",
                  duration: 0.58,
                  ease: "power3.out",
                  overwrite: true,
                });
              });
            },
          });

          const ledgerRows = gsap.utils.toArray<HTMLElement>("[data-gsap='ledger-row']");
          gsap.set(ledgerRows, {
            autoAlpha: 0,
            x: (index) => (index % 2 === 0 ? -24 : 24),
          });
          ScrollTrigger.batch("[data-gsap='ledger-row']", {
            start: "top 88%",
            once: true,
            onEnter: (batch) => {
              runWhenProgrammaticScrollSettles(() => {
                gsap.to(batch, {
                  autoAlpha: 1,
                  x: 0,
                  stagger: 0.055,
                  duration: 0.42,
                  ease: "power3.out",
                  overwrite: true,
                });
              });
            },
          });

          gsap.set("[data-gsap='cta-panel']", {
            autoAlpha: 0,
            y: 28,
            scaleX: 0.96,
            transformOrigin: "50% 50%",
          });
          ScrollTrigger.batch("[data-gsap='cta-panel']", {
            start: "top 84%",
            once: true,
            onEnter: (batch) => {
              runWhenProgrammaticScrollSettles(() => {
                gsap.to(batch, {
                  autoAlpha: 1,
                  y: 0,
                  scaleX: 1,
                  duration: 0.5,
                  ease: "power3.out",
                  overwrite: true,
                });
              });
            },
          });

          gsap.set("[data-gsap='cta-action']", {
            autoAlpha: 0,
            x: (index) => (index % 2 === 0 ? 24 : -24),
            y: 12,
          });
          ScrollTrigger.batch("[data-gsap='cta-action']", {
            start: "top 90%",
            once: true,
            onEnter: (batch) => {
              runWhenProgrammaticScrollSettles(() => {
                gsap.to(batch, {
                  autoAlpha: 1,
                  x: 0,
                  y: 0,
                  stagger: 0.07,
                  duration: 0.38,
                  ease: "power3.out",
                  overwrite: true,
                });
              });
            },
          });

          gsap.set("[data-gsap='footer-panel']", {
            autoAlpha: 0,
            y: 48,
            scaleY: 0.96,
            transformOrigin: "50% 100%",
          });
          ScrollTrigger.batch("[data-gsap='footer-panel']", {
            start: "top 86%",
            once: true,
            onEnter: (batch) => {
              runWhenProgrammaticScrollSettles(() => {
                gsap.to(batch, {
                  autoAlpha: 1,
                  y: 0,
                  scaleY: 1,
                  duration: 0.66,
                  ease: "power3.out",
                  overwrite: true,
                });
              });
            },
          });

          gsap.to("[data-gsap-active='true']", {
            y: -3,
            repeat: -1,
            yoyo: true,
            duration: 1.8,
            ease: "sine.inOut",
          });

          gsap.to("[data-gsap='ledger-row']", {
            backgroundColor: "rgba(166,77,121,0.105)",
            repeat: -1,
            yoyo: true,
            duration: 0.52,
            ease: "sine.inOut",
            stagger: { each: 1.05, repeat: -1 },
          });

          if (conditions.finePointer) {
            const ctas = gsap.utils.toArray<HTMLElement>("[data-gsap-magnetic]");
            const pointerCleanups = ctas.map((cta) => {
              const xTo = gsap.quickTo(cta, "x", { duration: 0.28, ease: "power3.out" });
              const yTo = gsap.quickTo(cta, "y", { duration: 0.28, ease: "power3.out" });

              const onMove = (event: MouseEvent) => {
                const rect = cta.getBoundingClientRect();
                xTo((event.clientX - rect.left - rect.width / 2) * 0.1);
                yTo((event.clientY - rect.top - rect.height / 2) * 0.2);
              };
              const onLeave = () => {
                xTo(0);
                yTo(0);
              };

              cta.addEventListener("mousemove", onMove);
              cta.addEventListener("mouseleave", onLeave);

              return () => {
                cta.removeEventListener("mousemove", onMove);
                cta.removeEventListener("mouseleave", onLeave);
              };
            });

            cleanups.push(...pointerCleanups);
          }

          return () => {
            cleanups.forEach((cleanup) => cleanup());
          };
        }, root);

        ScrollTrigger.refresh();
        return () => ctx.revert();
      },
      root,
    );

    return () => mm.revert();
  }, []);

  return (
    <main ref={rootRef} className={className} style={style}>
      <div
        data-gsap-intro="intro-scroll-trace"
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 70,
          height: "2px",
          pointerEvents: "none",
          background: "rgba(166,77,121,0.12)",
        }}
      >
        <div
          ref={progressRef}
          style={{
            width: "100%",
            height: "100%",
            transform: "scaleX(0)",
            transformOrigin: "0% 50%",
            background:
              "linear-gradient(90deg, rgba(106,30,85,0.34), rgba(242,167,184,0.78), rgba(255,211,166,0.42))",
            boxShadow: "0 0 14px rgba(242,167,184,0.18)",
          }}
        />
      </div>
      <div id="smooth-wrapper">
        <div id="smooth-content">{children}</div>
      </div>
    </main>
  );
}
