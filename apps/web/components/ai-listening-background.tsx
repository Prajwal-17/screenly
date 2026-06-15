"use client";

import { AnimatePresence, motion } from "motion/react";

interface AIListeningBackgroundProps {
  active: boolean;
}

export function AIListeningBackground({ active }: AIListeningBackgroundProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="ai-bg"
          className="absolute pointer-events-none"
          style={{
            inset: "-80px",
            zIndex: 0,
            overflow: "hidden",
            // Circular mask — fades from fully visible center to transparent edges
            maskImage:
              "radial-gradient(circle 340px at 50% 50%, black 0%, black 35%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(circle 340px at 50% 50%, black 0%, black 35%, transparent 70%)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        >
          {/* ── Blob 1: top-left, indigo ── */}
          <motion.div
            className="absolute"
            style={{
              top: "-5%",
              left: "-5%",
              width: "60%",
              height: "60%",
              borderRadius: "60% 40% 55% 45% / 40% 60% 45% 55%",
              background:
                "radial-gradient(ellipse at center, rgba(99,102,241,0.75) 0%, rgba(99,102,241,0.35) 50%, transparent 75%)",
              filter: "blur(28px)",
              willChange: "transform",
            }}
            animate={{
              x: [0, 65, -30, 20, 0],
              y: [0, -45, 30, -10, 0],
              scale: [1, 1.2, 0.88, 1.05, 1],
              rotate: [0, 8, -5, 2, 0],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* ── Blob 2: bottom-right, cyan ── */}
          <motion.div
            className="absolute"
            style={{
              bottom: "-5%",
              right: "-5%",
              width: "58%",
              height: "58%",
              borderRadius: "45% 55% 40% 60% / 55% 45% 60% 40%",
              background:
                "radial-gradient(ellipse at center, rgba(34,211,238,0.65) 0%, rgba(34,211,238,0.3) 50%, transparent 75%)",
              filter: "blur(30px)",
              willChange: "transform",
            }}
            animate={{
              x: [0, -55, 25, -15, 0],
              y: [0, 40, -20, 10, 0],
              scale: [1, 0.85, 1.15, 0.95, 1],
              rotate: [0, -7, 4, -2, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.6,
            }}
          />

          {/* ── Blob 3: center, violet — breathing anchor ── */}
          <motion.div
            className="absolute"
            style={{
              top: "20%",
              left: "22%",
              width: "56%",
              height: "56%",
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse at center, rgba(139,92,246,0.6) 0%, rgba(139,92,246,0.25) 55%, transparent 80%)",
              filter: "blur(22px)",
              willChange: "transform",
            }}
            animate={{
              scale: [1, 1.18, 0.9, 1.1, 1],
              x: [0, 25, -18, 12, 0],
              y: [0, -18, 22, -6, 0],
              opacity: [0.75, 1, 0.8, 1, 0.75],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3,
            }}
          />

          {/* ── Blob 4: top-right, blue ── */}
          <motion.div
            className="absolute"
            style={{
              top: "5%",
              right: "5%",
              width: "42%",
              height: "44%",
              borderRadius: "55% 45% 60% 40% / 45% 55% 40% 60%",
              background:
                "radial-gradient(ellipse at center, rgba(59,130,246,0.6) 0%, rgba(59,130,246,0.2) 55%, transparent 75%)",
              filter: "blur(24px)",
              willChange: "transform",
            }}
            animate={{
              x: [0, -35, 18, -8, 0],
              y: [0, 30, -14, 8, 0],
              scale: [1, 1.1, 0.92, 1.05, 1],
              rotate: [0, 10, -4, 2, 0],
            }}
            transition={{
              duration: 5.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />

          {/* ── Blob 5: bottom-left, purple ── */}
          <motion.div
            className="absolute"
            style={{
              bottom: "8%",
              left: "8%",
              width: "40%",
              height: "42%",
              borderRadius: "40% 60% 50% 50% / 50% 40% 60% 50%",
              background:
                "radial-gradient(ellipse at center, rgba(168,85,247,0.55) 0%, rgba(168,85,247,0.2) 55%, transparent 75%)",
              filter: "blur(26px)",
              willChange: "transform",
            }}
            animate={{
              x: [0, 38, -14, 10, 0],
              y: [0, -24, 14, -6, 0],
              scale: [1, 1.08, 0.9, 1.04, 1],
              rotate: [0, -6, 3, -1, 0],
            }}
            transition={{
              duration: 4.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.8,
            }}
          />

          {/* ── Aurora sweep — diagonal flow ── */}
          <motion.div
            className="absolute"
            style={{
              top: "25%",
              left: "-20%",
              width: "140%",
              height: "45%",
              background:
                "linear-gradient(135deg, transparent 0%, rgba(99,102,241,0.18) 20%, rgba(139,92,246,0.25) 45%, rgba(34,211,238,0.2) 70%, transparent 100%)",
              filter: "blur(20px)",
              borderRadius: "50%",
              willChange: "transform",
            }}
            animate={{
              x: [0, 60, -35, 15, 0],
              y: [0, -25, 18, -8, 0],
              scaleX: [1, 1.15, 0.9, 1.05, 1],
              scaleY: [1, 0.85, 1.1, 0.95, 1],
              rotate: [-2, 4, -2, 1, -2],
            }}
            transition={{
              duration: 6.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.2,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
