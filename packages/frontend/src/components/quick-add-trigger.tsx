"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuickAddBar } from "@/components/quick-add-bar";

export function QuickAddTrigger() {
  const [open, setOpen] = useState(false);

  // Keyboard shortcut: Ctrl/Cmd + K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
        title="Task Quick Add (Ctrl+K)"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Task Quick Add</span>
        </div>
        <kbd className="text-[10px] text-muted-foreground border px-1.5 py-0.5 rounded">
          Ctrl K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Task Quick Add
            </DialogTitle>
          </DialogHeader>
          <QuickAddBar autoFocus onCreated={() => setOpen(false)} />
          <p className="text-xs text-muted-foreground mt-1">
            Tip: include a date ("tomorrow 3pm"), assignee ("@sarah"), priority ("urgent"),
            workstream ("#IT"), or recurrence ("every Monday").
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
