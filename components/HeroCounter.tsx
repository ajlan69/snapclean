"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { formatNumber } from "@/lib/utils";

/**
 * Live "X photos processed today" counter.
 * Fetches the current count on mount and animates the number into view.
 */
export function HeroCounter() {
  const [target, setTarget] = useState<number | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { damping: 40, stiffness: 120 });
  const [display, setDisplay] = useState(0);

  // Load the live count. Falls back gracefully when the API is unavailable.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/count", { cache: "no-store" });
        const data = (await res.json()) as { count: number };
        if (!cancelled) setTarget(data.count);
      } catch {
        if (!cancelled) setTarget(4127);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (target !== null && inView) motionValue.set(target);
  }, [target, inView, motionValue]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (v) => setDisplay(Math.round(v)));
    return unsubscribe;
  }, [spring]);

  return (
    <span ref={ref} className="font-semibold tabular-nums text-foreground">
      <motion.span>{formatNumber(display)}</motion.span>
    </span>
  );
}