"use client";

import { lazy, Suspense, useState, type ComponentType } from "react";
import {
  Image as ImageIcon,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancePanel } from "@/components/editor/panels/EnhancePanel";
import { EffectsPanel } from "@/components/editor/panels/EffectsPanel";
import { cn } from "@/lib/utils";

// Heavy panels are code-split and loaded only when their tab is opened.
const CutoutPanel = lazy(() => import("@/components/editor/panels/CutoutPanel"));
const BackgroundPanel = lazy(
  () => import("@/components/editor/panels/BackgroundPanel")
);

interface TabDef {
  value: string;
  label: string;
  icon: LucideIcon;
  Panel: ComponentType;
}

const TABS: TabDef[] = [
  { value: "cutout", label: "Cutout", icon: Scissors, Panel: CutoutPanel },
  {
    value: "background",
    label: "Background",
    icon: ImageIcon,
    Panel: BackgroundPanel,
  },
  {
    value: "enhance",
    label: "Enhance",
    icon: SlidersHorizontal,
    Panel: EnhancePanel,
  },
  { value: "effects", label: "Effects", icon: Sparkles, Panel: EffectsPanel },
];

function PanelSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-8 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}

function ToolTabs({
  orientation,
  className,
}: {
  orientation: "vertical" | "horizontal";
  className?: string;
}) {
  const vertical = orientation === "vertical";

  return (
    <Tabs
      defaultValue="cutout"
      orientation={orientation}
      className={cn(
        "flex min-h-0",
        vertical ? "flex-1 flex-row gap-2 p-2" : "flex-col",
        className
      )}
    >
      <TabsList
        className={cn(
          "bg-transparent p-0",
          vertical
            ? "flex h-auto w-16 shrink-0 flex-col gap-1"
            : "flex h-auto w-full flex-row gap-1 overflow-x-auto p-1"
        )}
      >
        {TABS.map(({ value, label, icon: Icon }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="flex h-auto flex-col gap-1 px-2 py-2 text-[10px] leading-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <div
        className={cn(
          "min-h-0 flex-1",
          vertical ? "overflow-y-auto pr-1" : "mt-3"
        )}
      >
        {TABS.map(({ value, Panel }) => (
          <TabsContent key={value} value={value} className="mt-0">
            <Suspense fallback={<PanelSkeleton />}>
              <Panel />
            </Suspense>
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}

/** Desktop collapsible tool panel (right-hand column). */
export function EditorSidebar() {
  return (
    <aside className="hidden min-h-0 flex-col overflow-hidden rounded-2xl border bg-card md:flex">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
        <Wrench className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Tools</h2>
      </div>
      <ToolTabs orientation="vertical" />
    </aside>
  );
}

/** Mobile floating trigger + bottom sheet that hosts the same tools. */
export function MobileToolSheet() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        className="fixed bottom-20 right-3 z-40 shadow-lg md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open tools"
      >
        <Wrench className="h-4 w-4" />
        Tools
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto p-4"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              Tools
            </SheetTitle>
          </SheetHeader>
          <div className="mt-3">
            <ToolTabs orientation="horizontal" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
