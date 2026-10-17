"use client";

import { useState, type FormEvent } from "react";
import { BellPlus, CheckCircle2, Loader2, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface WaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill the email field (e.g. the signed-in user's address). */
  defaultEmail?: string;
  source?: string;
  title?: string;
  description?: string;
}

/**
 * Controlled "Join the Pro waitlist" dialog. Payments are postponed, so this
 * collects interest by email instead of starting a checkout.
 */
export function WaitlistDialog({
  open,
  onOpenChange,
  defaultEmail = "",
  source = "app",
  title = "Join the Pro waitlist",
  description = "Pro — unlimited images and full-resolution HD exports — is coming soon. Leave your email and we'll let you know the moment it's ready.",
}: WaitlistDialogProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't join the waitlist.");
      setDone(true);
      toast.success("You're on the list!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // Reset the form whenever the dialog is dismissed so it's clean next time.
  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setDone(false);
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <DialogHeader className="items-center sm:text-center">
              <DialogTitle>You&apos;re on the waitlist</DialogTitle>
              <DialogDescription>
                Thanks! We&apos;ll email <strong>{email}</strong> as soon as Pro
                launches. Until then, enjoy 10 free images every day.
              </DialogDescription>
            </DialogHeader>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="waitlist-email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="waitlist-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BellPlus className="h-4 w-4" />
                )}
                Join waitlist
              </Button>
            </DialogFooter>

            <p className="text-center text-xs text-muted-foreground">
              No payment required — we&apos;ll only email you about Pro.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface WaitlistButtonProps {
  label?: string;
  defaultEmail?: string;
  source?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}

/**
 * Button that opens the Pro waitlist dialog. Use this anywhere an
 * "Upgrade to Pro" call-to-action used to live.
 */
export function WaitlistButton({
  label = "Join Pro Waitlist",
  defaultEmail,
  source = "app",
  variant = "default",
  size,
  className,
}: WaitlistButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-4 w-4" />
        {label}
      </Button>
      <WaitlistDialog
        open={open}
        onOpenChange={setOpen}
        defaultEmail={defaultEmail}
        source={source}
      />
    </>
  );
}
