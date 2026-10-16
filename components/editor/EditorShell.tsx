"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Download,
  ImageUp,
  LayoutDashboard,
  Loader2,
  LogOut,
  Redo2,
  RefreshCw,
  RotateCcw,
  Undo2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { UploadZone } from "@/components/UploadZone";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { WaitlistButton, WaitlistDialog } from "@/components/WaitlistButton";
import {
  EditorSidebar,
  MobileToolSheet,
} from "@/components/editor/EditorSidebar";
import { useEditor } from "@/components/editor/editor-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase";
import { buildFilter } from "@/lib/photo";
import { FREE_DAILY_LIMIT } from "@/lib/usage";
import { cn, isValidImageFile } from "@/lib/utils";

export function EditorShell() {
  const {
    undo,
    redo,
    handleDownload,
    status,
    showUpgrade,
    setShowUpgrade,
  } = useEditor();

  // Global keyboard shortcuts: ⌘/Ctrl+Z (undo), ⌘/Ctrl+Shift+Z or Ctrl+Y
  // (redo) and ⌘/Ctrl+S (download). Ignored while typing in a field.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (key === "y") {
        e.preventDefault();
        redo();
      } else if (key === "s") {
        e.preventDefault();
        if (status === "ready") handleDownload();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, handleDownload, status]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
        <EditorTopBar />

        <div className="min-h-0 flex-1">
          <div className="mx-auto h-full w-full max-w-[1600px] px-3 py-3 tv:max-w-[1400px] tv:px-6 tv:text-lg">
            <div className="grid h-full min-h-0 grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
              <EditorCanvas />
              <EditorSidebar />
            </div>
          </div>
        </div>

        <EditorBottomBar />
        <MobileToolSheet />

        <WaitlistDialog
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          source="editor-quota"
          title="You've reached today's free limit"
          description={`Free accounts can process ${FREE_DAILY_LIMIT} images per day. Join the Pro waitlist for unlimited images, HD downloads and no watermark.`}
        />
      </div>
    </TooltipProvider>
  );
}

function EditorTopBar() {
  const { handleFile, isPro } = useEditor();
  const user = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) {
      const { ok, error } = isValidImageFile(picked);
      if (!ok) toast.error(error ?? "Invalid file.");
      else handleFile(picked);
    }
    e.target.value = "";
  };

  return (
    <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background/80 px-3 backdrop-blur md:px-4">
      <Link
        href="/"
        className="flex items-center gap-2 font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Wand2 className="h-4 w-4" />
        </span>
        <span className="hidden sm:inline">SnapClean</span>
      </Link>

      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onPickFile}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageUp className="h-4 w-4" />
          <span className="hidden sm:inline">Upload</span>
        </Button>

        {isPro ? (
          <Badge variant="success">Pro</Badge>
        ) : (
          <WaitlistButton
            label="Go Pro"
            source="editor"
            size="sm"
            className="hidden sm:inline-flex"
          />
        )}

        <ProfileMenu email={user?.email ?? null} loading={user === undefined} />
      </div>
    </header>
  );
}

function ProfileMenu({
  email,
  loading,
}: {
  email: string | null;
  loading: boolean;
}) {
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }, [router]);

  if (loading) {
    return (
      <Button variant="ghost" size="icon" aria-label="Account" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (!email) {
    return (
      <Button asChild size="sm">
        <Link href="/login">Sign in</Link>
      </Button>
    );
  }

  const initial = email.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Account menu"
          className="h-8 w-8 rounded-full text-xs font-semibold"
        >
          {initial}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="cursor-pointer">
            <LayoutDashboard />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onSelect={handleSignOut}
        >
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EditorCanvas() {
  const {
    status,
    progress,
    progressLabel,
    originalUrl,
    processedUrl,
    adjustments,
    background,
    isPro,
    handleFile,
    reset,
  } = useEditor();

  return (
    <div className="flex min-h-0 flex-col items-center justify-center overflow-y-auto rounded-2xl p-1">
      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="w-full max-w-xl"
          >
            <UploadZone onFile={handleFile} />
          </motion.div>
        )}

        {status === "processing" && originalUrl && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative aspect-square w-full max-w-[560px] overflow-hidden rounded-2xl border bg-checkerboard tv:max-w-[720px]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={originalUrl}
              alt="Processing"
              className="h-full w-full object-contain opacity-40 blur-sm"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/60 backdrop-blur-sm">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium">
                {progressLabel}
                {progress > 0 ? ` ${progress}%` : ""}
              </p>
              <Progress value={progress} className="w-2/3" />
              <p className="text-xs text-muted-foreground">
                Runs entirely on your device
              </p>
            </div>
          </motion.div>
        )}

        {status === "ready" && originalUrl && processedUrl && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-[560px] tv:max-w-[720px]"
          >
            <BeforeAfterSlider
              before={originalUrl}
              after={processedUrl}
              afterFilter={buildFilter(adjustments)}
              background={background}
              watermark={!isPro}
            />
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex aspect-square w-full max-w-[560px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed"
          >
            <p className="text-sm text-muted-foreground">
              Something went wrong processing that image.
            </p>
            <Button onClick={reset} variant="outline">
              <RefreshCw className="h-4 w-4" />
              Try another image
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EditorBottomBar() {
  const {
    status,
    downloading,
    handleDownload,
    resetAll,
    dirty,
    undo,
    redo,
    canUndo,
    canRedo,
    isPro,
    used,
  } = useEditor();

  const ready = status === "ready";
  const usageLabel = isPro ? "Unlimited" : `${used}/${FREE_DAILY_LIMIT} today`;

  return (
    <footer className="z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-t bg-background/80 px-3 backdrop-blur md:px-4">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={resetAll}
          disabled={!dirty}
          className="hidden sm:inline-flex"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Undo"
          onClick={undo}
          disabled={!canUndo}
          className="h-9 w-9"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Redo"
          onClick={redo}
          disabled={!canRedo}
          className="h-9 w-9"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Badge variant="outline" className="hidden sm:inline-flex">
          {usageLabel}
        </Badge>
        <Button
          onClick={handleDownload}
          disabled={!ready || downloading}
          className={cn("min-w-[7.5rem]")}
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isPro ? "Download HD" : "Download"}
        </Button>
      </div>
    </footer>
  );
}
