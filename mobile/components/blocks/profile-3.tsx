"use client";

import { motion } from "motion/react";
import { Users, FileText } from "lucide-react";
import { useState } from "react";

export default function Profile3() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section className="w-full min-h-screen flex items-start lg:items-center py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-neutral-950">
      <div className="max-w-[1400px] mx-auto w-full flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          className="relative w-full max-w-sm"
        >
          {/* Main Card */}
          <div className="relative bg-white dark:bg-neutral-900 rounded-3xl shadow-lg overflow-hidden border border-neutral-200 dark:border-neutral-800">
            {/* Expanded Background Image on Hover */}
            <motion.div
              className="absolute inset-0 z-0"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{
                opacity: isHovered ? 1 : 0,
                scale: isHovered ? 1 : 1.1,
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {/* Background Image */}
              <div className="absolute inset-0">
                <img
                  src="/svg/placeholder.svg"
                  alt="Background"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Blur and Gradient Overlay */}
              <div className="absolute inset-0 backdrop-blur-2xl bg-linear-to-b from-white/90 via-white/95 to-white dark:from-neutral-900/90 dark:via-neutral-900/95 dark:to-neutral-900" />
            </motion.div>

            {/* Card Content */}
            <div className="relative z-10 p-2">
              {/* Profile Image */}
              <div className="mb-4">
                <div className="relative w-full aspect-4/5 rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                  <img
                    src="/svg/placeholder.svg"
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                  {/* Gradient overlay to fade out at bottom */}
                  <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-white dark:to-neutral-900 pointer-events-none" />
                </div>
              </div>

              {/* Profile Info */}
              <div className="mb-4 px-4">
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                  Sarah Chen
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Frontend developer focused on building fast, accessible, &
                  beautiful web experiences.
                </p>
              </div>

              {/* Stats and Action */}
              <div className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">243</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">18</span>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-5 py-2 rounded-full font-medium text-sm transition-colors duration-200 ${
                    isHovered
                      ? "bg-green-600 dark:bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-700"
                      : "border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  }`}
                >
                  {isHovered ? "Unfollow" : "Follow"}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
