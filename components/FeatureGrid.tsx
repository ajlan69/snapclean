"use client";

import { motion } from "framer-motion";
import { Download, Scissors, Sparkles } from "lucide-react";

const FEATURES = [
  {
    icon: Scissors,
    title: "Background Remover",
    description:
      "Cut out subjects in one click with an AI model that runs entirely in your browser. No uploads, no waiting.",
  },
  {
    icon: Sparkles,
    title: "HD Enhancer",
    description:
      "Fine-tune brightness, contrast and saturation, then export crisp HD PNGs with any background you like.",
  },
  {
    icon: Download,
    title: "Instant Download",
    description:
      "Get your transparent PNG immediately. Free exports include a small SnapClean watermark — Pro unlocks clean, full-resolution HD files.",
  },
];

export function FeatureGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {FEATURES.map((feature, i) => (
        <motion.div
          key={feature.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className="rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <feature.icon className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {feature.description}
          </p>
        </motion.div>
      ))}
    </div>
  );
}