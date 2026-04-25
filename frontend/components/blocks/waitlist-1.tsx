"use client";

import { useState } from "react";
import { motion } from "motion/react";

interface MarqueeItem {
  id: number;
  type: "avatar" | "logo";
  image: string;
  shape: "circle" | "square";
}

const COLUMN_1_ITEMS: MarqueeItem[] = [
  {
    id: 1,
    type: "logo",
    image: "https://api.dicebear.com/7.x/shapes/svg?seed=1",
    shape: "circle",
  },
  {
    id: 2,
    type: "avatar",
    image: "https://i.pravatar.cc/150?img=1",
    shape: "circle",
  },
  {
    id: 3,
    type: "logo",
    image: "https://api.dicebear.com/7.x/shapes/svg?seed=2",
    shape: "square",
  },
  {
    id: 4,
    type: "avatar",
    image: "https://i.pravatar.cc/150?img=2",
    shape: "circle",
  },
  {
    id: 5,
    type: "logo",
    image: "https://api.dicebear.com/7.x/shapes/svg?seed=3",
    shape: "circle",
  },
];

const COLUMN_2_ITEMS: MarqueeItem[] = [
  {
    id: 6,
    type: "logo",
    image: "https://api.dicebear.com/7.x/shapes/svg?seed=4",
    shape: "square",
  },
  {
    id: 7,
    type: "avatar",
    image: "https://i.pravatar.cc/150?img=3",
    shape: "circle",
  },
  {
    id: 8,
    type: "logo",
    image: "https://api.dicebear.com/7.x/shapes/svg?seed=5",
    shape: "circle",
  },
  {
    id: 9,
    type: "avatar",
    image: "https://i.pravatar.cc/150?img=4",
    shape: "circle",
  },
  {
    id: 10,
    type: "logo",
    image: "https://api.dicebear.com/7.x/shapes/svg?seed=6",
    shape: "square",
  },
];

const COLUMN_3_ITEMS: MarqueeItem[] = [
  {
    id: 11,
    type: "avatar",
    image: "https://i.pravatar.cc/150?img=5",
    shape: "circle",
  },
  {
    id: 12,
    type: "logo",
    image: "https://api.dicebear.com/7.x/shapes/svg?seed=7",
    shape: "circle",
  },
  {
    id: 13,
    type: "avatar",
    image: "https://i.pravatar.cc/150?img=6",
    shape: "circle",
  },
  {
    id: 14,
    type: "logo",
    image: "https://api.dicebear.com/7.x/shapes/svg?seed=8",
    shape: "square",
  },
  {
    id: 15,
    type: "logo",
    image: "https://api.dicebear.com/7.x/shapes/svg?seed=9",
    shape: "circle",
  },
];

const COLUMN_4_ITEMS: MarqueeItem[] = [
  {
    id: 16,
    type: "logo",
    image: "https://api.dicebear.com/7.x/shapes/svg?seed=10",
    shape: "square",
  },
  {
    id: 17,
    type: "avatar",
    image: "https://i.pravatar.cc/150?img=7",
    shape: "circle",
  },
  {
    id: 18,
    type: "logo",
    image: "https://api.dicebear.com/7.x/shapes/svg?seed=11",
    shape: "circle",
  },
  {
    id: 19,
    type: "avatar",
    image: "https://i.pravatar.cc/150?img=8",
    shape: "circle",
  },
  {
    id: 20,
    type: "logo",
    image: "https://api.dicebear.com/7.x/shapes/svg?seed=12",
    shape: "square",
  },
];

function MarqueeColumn({
  items,
  duration = 20,
  reverse = false,
}: {
  items: MarqueeItem[];
  duration?: number;
  reverse?: boolean;
}) {
  const duplicatedItems = [...items, ...items];
  const itemHeight = 112;
  const gap = 24;
  const totalHeight = items.length * (itemHeight + gap);

  return (
    <div className="relative h-full overflow-hidden">
      <motion.div
        className="flex flex-col gap-6"
        animate={{
          y: reverse ? [0, -totalHeight] : [-totalHeight, 0],
        }}
        transition={{
          duration: duration,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {duplicatedItems.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className={`w-full max-w-[7rem] aspect-square shrink-0 ${
              item.shape === "circle" ? "rounded-full" : "rounded-2xl"
            } overflow-hidden bg-neutral-200 dark:bg-neutral-800 shadow-lg`}
          >
            <img
              src={item.image}
              alt=""
              className="w-full h-full object-cover object-center"
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function WaitlistForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    agreed: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Form submitted:", formData);
    setIsSubmitting(false);
    setFormData({ name: "", email: "", agreed: false });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full md:max-w-lg"
    >
      <h2
        id="waitlist-heading"
        className="text-3xl sm:text-4xl font-medium tracking-tight text-neutral-900 dark:text-white mb-4"
      >
        Be the first to know when we launch React Bits Pro.
      </h2>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-6"
        aria-labelledby="waitlist-heading"
        noValidate
      >
        {/* Full Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
          >
            Full name*
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Jane Smith"
            autoComplete="name"
            aria-required="true"
            aria-label="Full name"
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-colors"
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
          >
            Email address*
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="jane.smith@example.com"
            autoComplete="email"
            aria-required="true"
            aria-label="Email address"
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-colors"
          />
        </div>

        {/* Checkbox */}
        <div className="flex items-start gap-3">
          <div className="relative flex items-center justify-center">
            <input
              type="checkbox"
              id="agree"
              name="agree"
              required
              checked={formData.agreed}
              onChange={(e) =>
                setFormData({ ...formData, agreed: e.target.checked })
              }
              aria-required="true"
              aria-label="I agree to the terms of service"
              className="peer w-5 h-5 appearance-none rounded border-2 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 cursor-pointer transition-all checked:bg-neutral-900 checked:dark:bg-white checked:border-neutral-900 checked:dark:border-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
            <svg
              className="absolute w-3 h-3 pointer-events-none hidden peer-checked:block text-white dark:text-neutral-900"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <label
            htmlFor="agree"
            className="text-sm text-neutral-600 dark:text-neutral-400 cursor-pointer"
          >
            I agree to the{" "}
            <a
              href="#"
              className="text-neutral-900 dark:text-white underline hover:no-underline"
              aria-label="Read terms of service"
            >
              terms of service
            </a>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          aria-label={
            isSubmitting ? "Submitting waitlist form" : "Submit waitlist form"
          }
          className="w-full sm:w-auto px-6 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg tracking-tight hover:bg-neutral-800 dark:hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 dark:focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </form>
    </motion.div>
  );
}

export default function Waitlist1() {
  return (
    <section className="w-full flex items-center py-12 md:py-0 px-4 sm:px-6 lg:px-8 bg-white dark:bg-neutral-950 overflow-hidden">
      <div className="max-w-[1400px] mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Left Column: Form */}
          <WaitlistForm />

          {/* Right Column: Marquee Columns */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden md:flex relative h-[600px] w-full gap-6 items-center justify-center -mr-8"
          >
            {/* Column 1 - Scrolls down */}
            <MarqueeColumn
              items={COLUMN_1_ITEMS}
              duration={25}
              reverse={false}
            />

            {/* Column 2 - Scrolls up */}
            <MarqueeColumn
              items={COLUMN_2_ITEMS}
              duration={20}
              reverse={true}
            />

            {/* Column 3 - Scrolls down */}
            <MarqueeColumn
              items={COLUMN_3_ITEMS}
              duration={30}
              reverse={false}
            />

            {/* Column 4 - Scrolls up */}
            <MarqueeColumn
              items={COLUMN_4_ITEMS}
              duration={22}
              reverse={true}
            />

            {/* Gradient Fade */}
            <div className="absolute inset-y-0 right-0 w-32 bg-linear-to-l from-white dark:from-neutral-950 to-transparent pointer-events-none z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
