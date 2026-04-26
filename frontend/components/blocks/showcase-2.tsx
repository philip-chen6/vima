"use client";

import { motion, useMotionValue, useAnimationFrame } from "motion/react";
import { useRef, useState, useEffect } from "react";

// vima evidence carousel: real frames from capture, each card is a spatial
// claim the model produced. drag horizontally to scroll. swap the `image`
// paths to real masonry frames once exported from cii-results.json.
// TODO: replace with actual construction frames; using yozakura placeholder set.
const SHOWCASE_ITEMS = [
  {
    id: 1,
    image: "/vima-yozakura-frames/frame_001.jpg",
    height: "h-[420px]",
    bgColor: "bg-[#1a0d14]",
  },
  {
    id: 2,
    image: "/vima-yozakura-frames/frame_004.jpg",
    height: "h-[440px]",
    bgColor: "bg-[#1a0d14]",
  },
  {
    id: 3,
    image: "/vima-yozakura-frames/frame_007.jpg",
    height: "h-[400px]",
    bgColor: "bg-[#1a0d14]",
  },
  {
    id: 4,
    image: "/vima-yozakura-frames/frame_010.jpg",
    height: "h-[420px]",
    bgColor: "bg-[#1a0d14]",
  },
  {
    id: 5,
    image: "/vima-yozakura-frames/frame_013.jpg",
    height: "h-[380px]",
    bgColor: "bg-[#1a0d14]",
  },
  {
    id: 6,
    image: "/vima-yozakura-frames/frame_015.jpg",
    height: "h-[440px]",
    bgColor: "bg-[#1a0d14]",
  },
];

export function Showcase2() {
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [oneSetWidth, setOneSetWidth] = useState(0);

  const baseVelocity = -20;
  const baseX = useMotionValue(0);
  const scrollVelocity = useRef(baseVelocity);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const items = [
    ...SHOWCASE_ITEMS,
    ...SHOWCASE_ITEMS,
    ...SHOWCASE_ITEMS,
    ...SHOWCASE_ITEMS,
    ...SHOWCASE_ITEMS,
    ...SHOWCASE_ITEMS,
  ];

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 640;
      const itemWidth = isMobile ? 280 : 320;
      const gap = 24;
      const width = (itemWidth + gap) * SHOWCASE_ITEMS.length;
      setOneSetWidth(width);

      baseX.set(-width);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [baseX]);

  useAnimationFrame((t, delta) => {
    if (!oneSetWidth) return;

    if (!isDragging) {
      scrollVelocity.current =
        scrollVelocity.current * 0.9 + baseVelocity * 0.1;

      const moveBy = scrollVelocity.current * (delta / 1000);
      baseX.set(baseX.get() + moveBy);

      const x = baseX.get();
      if (x <= -oneSetWidth * 2) {
        baseX.set(x + oneSetWidth);
      } else if (x > 0) {
        baseX.set(x - oneSetWidth);
      }
    }
  });

  return (
    <section className="w-full bg-transparent">
      <div className="max-w-[1400px] mx-auto w-full">
        {/* small mono kicker so people know what they're looking at — no
            big headline because showcase-2 lives inside the evidence
            section which already has its own H2. */}
        <p
          className="mb-4"
          style={{
            color: "rgba(247,236,239,0.46)",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.05em",
          }}
        >
          frame stream · drag to inspect
        </p>

        {/* Infinite Carousel */}
        <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden py-12">
          <motion.div
            ref={scrollerRef}
            className="flex items-end gap-6 cursor-grab active:cursor-grabbing"
            style={{ x: baseX }}
            drag="x"
            onDragStart={() => setIsDragging(true)}
            onDragEnd={(e, info) => {
              setIsDragging(false);
              scrollVelocity.current = info.velocity.x;
            }}
            dragElastic={0.05}
            dragMomentum={false}
          >
            {items.map((item, index) => (
              <motion.div
                key={`${item.id}-${index}`}
                className={`shrink-0 w-[280px] sm:w-[320px] ${item.height} rounded-2xl overflow-hidden select-none relative pointer-events-auto`}
                initial={{ rotateX: 0, opacity: 1 }}
                animate={
                  hoveredId === index
                    ? {
                        scale: 1.05,
                        rotateX: -15,
                        y: -25,
                        zIndex: 50,
                      }
                    : {
                        scale: 1,
                        rotateX: 0,
                        y: 0,
                        zIndex: 1,
                      }
                }
                transition={{
                  duration: 0.3,
                  ease: "backOut",
                  zIndex: { delay: hoveredId === index ? 0 : 0.4 },
                }}
                onMouseEnter={() => setHoveredId(index)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ transformPerspective: 1000 }}
              >
                <div className={`w-full h-full ${item.bgColor}`}>
                  <img
                    src={item.image}
                    alt="Showcase item"
                    className="w-full h-full object-cover object-top pointer-events-none"
                    draggable="false"
                  />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
