"use client";

import { motion } from "motion/react";
import { Eye, Activity, GitBranch, TrendingUp } from "lucide-react";
import { useEffect, useRef } from "react";

export function Features3() {
  const marquee1Ref = useRef<HTMLDivElement>(null);
  const marquee2Ref = useRef<HTMLDivElement>(null);

  // The episode types vima's episodic memory emits, taken directly from the
  // paper. Layout fits four; the fifth (material_staging_visible) is folded
  // into the masonry/scaffold context so the 2x2 grid stays clean.
  const features = [
    {
      icon: Activity,
      description: "masonry_work_candidate — observed work in progress on the masonry plane",
    },
    {
      icon: GitBranch,
      description: "scaffold_zone_visible — scaffolding plank or rail in the active frame",
    },
    {
      icon: Eye,
      description: "safety_edge_context — exposed edge or fall hazard in view",
    },
    {
      icon: TrendingUp,
      description: "foreground_worker_present — primary subject in motion or labor",
    },
  ];

  // Frames feeding the verification queue. Each is one piece of evidence
  // attached to a claim. Drag through the swipe deck on iOS to confirm.
  // These are actual masonry bodycam frames from the production run.
  const images = [
    { name: "masonry frame 00", url: "/masonry-frames-raw/frame_0000_00000000.jpg" },
    { name: "masonry frame 05", url: "/masonry-frames-raw/frame_0005_00010000.jpg" },
    { name: "masonry frame 10", url: "/masonry-frames-raw/frame_0010_00020000.jpg" },
    { name: "masonry frame 15", url: "/masonry-frames-raw/frame_0015_00030000.jpg" },
    { name: "masonry frame 20", url: "/masonry-frames-raw/frame_0020_00040000.jpg" },
    { name: "masonry frame 29", url: "/masonry-frames-raw/frame_0029_00058000.jpg" },
  ];

  useEffect(() => {
    const marquee1 = marquee1Ref.current;
    const marquee2 = marquee2Ref.current;

    if (!marquee1 || !marquee2) return;

    let animation1: number;
    let progress1 = 0;
    let progress2 = 50;

    const animate = () => {
      progress1 += 0.03;
      if (progress1 >= 50) {
        progress1 = 0;
      }
      marquee1.style.transform = `translateY(-${progress1}%)`;

      progress2 -= 0.03;
      if (progress2 <= 0) {
        progress2 = 50;
      }
      marquee2.style.transform = `translateY(-${progress2}%)`;

      animation1 = requestAnimationFrame(animate);
    };

    animation1 = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animation1);
    };
  }, []);

  return (
    <section className="w-full py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-transparent">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-center">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 flex flex-col">
            {/* Header */}
            <div className="mb-8 md:mb-12">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 mb-4"
              >
                episode taxonomy · five shapes from the paper
              </motion.p>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal text-neutral-900 dark:text-white mb-6"
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
              >
                every claim is one of five shapes.
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl"
              >
                Vima&apos;s episodic memory emits one of five episode types per
                detected event. The shape makes the claim reviewable in
                seconds. A human swipes, the claim resolves, the reviewed
                evidence enters the audit trail.
              </motion.p>
            </div>

            {/* Features Grid - 2x2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                    className="flex items-start gap-3 sm:gap-4"
                  >
                    {/* Icon */}
                    <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex items-center justify-center shadow-lg">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-900 dark:text-white" />
                    </div>

                    {/* Description */}
                    <p className="text-xs max-w-[20ch] tracking-tighter sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right Column - 1/3 width - Marquees */}
          <div className="lg:col-span-1 relative h-[200px] lg:h-[700px]">
            <div className="grid grid-cols-2 gap-4 h-full relative overflow-hidden rounded-2xl">
              {/* Gradient Overlays */}
              <div className="absolute inset-0 pointer-events-none z-10">
                <div className="absolute top-0 left-0 right-0 h-24 bg-linear-to-b from-white dark:from-neutral-950 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-linear-to-t from-white dark:from-neutral-950 to-transparent" />
              </div>

              {/* Marquee 1 - Scrolling Down */}
              <div className="relative overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  ref={marquee1Ref}
                  className="flex flex-col gap-4"
                >
                  {[...images, ...images].map((image, index) => (
                    <div
                      key={`marquee1-${index}`}
                      className="w-full aspect-square rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center overflow-hidden"
                    >
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover grayscale opacity-80 hover:opacity-100 transition-opacity duration-300"
                      />
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Marquee 2 - Scrolling Up */}
              <div className="relative overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  ref={marquee2Ref}
                  className="flex flex-col gap-4"
                >
                  {[...images, ...images].map((image, index) => (
                    <div
                      key={`marquee2-${index}`}
                      className="w-full aspect-square rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center overflow-hidden"
                    >
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover grayscale opacity-80 hover:opacity-100 transition-opacity duration-300"
                      />
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
