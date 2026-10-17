"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { useEditor } from "@/components/editor/editor-store";

const BASE_MESSAGES = [
  "Analyzing image…",
  "Detecting subject…",
  "Removing background…",
  "Refining edges…",
  "Almost done…",
];

const HIGH_QUALITY_MESSAGES = [
  "Analyzing image…",
  "Applying advanced AI matting…",
  "Detecting subject…",
  "Removing background…",
  "Refining edges…",
  "Almost done…",
];

const MESSAGE_INTERVAL = 1500;

export function AIProcessingOverlay() {
  const { highQuality } = useEditor();
  const messages = highQuality ? HIGH_QUALITY_MESSAGES : BASE_MESSAGES;
  const [index, setIndex] = useState(0);

  // Restart the sequence whenever the engine switches.
  useEffect(() => {
    setIndex(0);
  }, [highQuality]);

  // Advance to the next message every 1.5s, holding on "Almost done…".
  useEffect(() => {
    if (index >= messages.length - 1) return;
    const timer = setTimeout(
      () => setIndex((i) => Math.min(i + 1, messages.length - 1)),
      MESSAGE_INTERVAL
    );
    return () => clearTimeout(timer);
  }, [index, messages.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-20 rounded-2xl p-[1.5px]"
    >
      {/* Shimmering gradient border */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          backgroundImage:
            "linear-gradient(110deg, hsl(var(--primary)), transparent 35%, hsl(var(--primary)) 65%, transparent)",
          backgroundSize: "250% 100%",
        }}
        animate={{ backgroundPosition: ["0% 50%", "250% 50%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative flex h-full w-full flex-col items-center justify-center gap-6 overflow-hidden rounded-[calc(var(--radius)-2px)] bg-background/60 px-6 text-center backdrop-blur-md">
        {/* Skeleton-style shimmer sweeping across the placeholder */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-0 h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-foreground/10 to-transparent"
            initial={{ x: "-150%" }}
            animate={{ x: "350%" }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          />
        </div>

        {/* Pulsing glow */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute h-40 w-40 rounded-full bg-primary/25 blur-3xl"
          animate={{ opacity: [0.35, 0.7, 0.35], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/30"
        >
          <Sparkles className="h-8 w-8 text-primary" />
        </motion.div>

        <div className="relative flex h-6 items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={messages[index]}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="text-sm font-medium sm:text-base"
            >
              {messages[index]}
            </motion.p>
          </AnimatePresence>
        </div>

        <p className="relative text-xs text-muted-foreground">
          Runs entirely on your device
        </p>
      </div>
    </motion.div>
  );
}
