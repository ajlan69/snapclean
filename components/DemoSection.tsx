import { MousePointerClick } from "lucide-react";

import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";

/**
 * Landing-page "See it in action" demo: an interactive before/after slider
 * comparing a sample photo with its on-device cutout.
 */
export function DemoSection() {
  return (
    <section className="border-b bg-muted/20 py-16 md:py-24">
      <div className="container px-4">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            Live demo
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            See it in action
          </h2>
          <p className="mt-3 text-muted-foreground">
            Drag the slider to reveal the background removed — clean edges, hair
            and all. Every cutout runs on your device, never on a server.
          </p>
        </div>

        <div className="mx-auto max-w-lg">
          <BeforeAfterSlider before="/demo/before.jpg" after="/demo/after.png" />
          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <MousePointerClick className="h-4 w-4" />
            Drag the handle to compare
          </p>
        </div>
      </div>
    </section>
  );
}
