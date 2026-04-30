"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, X, Calendar, User, Flame, Layers, Loader2, Repeat } from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface QuickAddPreview {
  title: string;
  startDate: string | null;
  dueDate: string | null;
  priority: string;
  type: string;
  workstream: { id: string; code: string; name: string; color: string } | null;
  assignee: { id: string; name: string; email: string } | null;
  recurrenceType: string | null;
}

const priorityClass: Record<string, string> = {
  Critical: "text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300",
  High: "text-orange-700 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-300",
  Medium: "text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300",
  Low: "text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300",
};

interface QuickAddBarProps {
  autoFocus?: boolean;
  onCreated?: () => void;
}

export function QuickAddBar({ autoFocus, onCreated }: QuickAddBarProps = {}) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<QuickAddPreview | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setPreview(null);
      setParseError(null);
      setIsParsing(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const reqId = ++requestIdRef.current;
      setIsParsing(true);
      setParseError(null);
      try {
        const { data } = await api.post("/tasks/quick-add", { text, dryRun: true });
        if (reqId !== requestIdRef.current) return; // stale response
        setPreview(data.preview);
      } catch (err: any) {
        if (reqId !== requestIdRef.current) return;
        setParseError(err.response?.data?.error || "Could not parse — try rephrasing.");
        setPreview(null);
      } finally {
        if (reqId === requestIdRef.current) setIsParsing(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text]);

  const handleSubmit = async () => {
    if (!preview || isCreating) return;
    setIsCreating(true);
    try {
      await api.post("/tasks/quick-add", { text, dryRun: false });
      toast.success("Task created");
      setText("");
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onCreated?.();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create task");
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && preview && !isCreating) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setText("");
      setPreview(null);
      setParseError(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Quick add — try "Submit report tomorrow 3pm to Sarah, urgent"'
          className="pl-9 pr-16 h-10"
          disabled={isCreating}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {(isParsing || isCreating) && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {text && !isParsing && !isCreating && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => {
                setText("");
                setPreview(null);
                setParseError(null);
              }}
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {parseError && (
        <p className="text-xs text-red-600 dark:text-red-400 px-2">{parseError}</p>
      )}

      {preview && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-md border bg-muted/40">
          <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Preview
          </span>
          <span className="text-sm font-medium">{preview.title}</span>
          {(preview.startDate || preview.dueDate) && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-background border">
              <Calendar className="h-3 w-3" />
              {preview.startDate && preview.dueDate ? (
                <>
                  {format(new Date(preview.startDate), "EEE d MMM")}
                  <span className="text-muted-foreground">→</span>
                  {format(new Date(preview.dueDate), "EEE d MMM")}
                </>
              ) : preview.dueDate ? (
                format(new Date(preview.dueDate), "EEE d MMM, h:mm a")
              ) : (
                <>Start: {format(new Date(preview.startDate!), "EEE d MMM")}</>
              )}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${priorityClass[preview.priority] || priorityClass.Medium}`}
          >
            <Flame className="h-3 w-3" />
            {preview.priority}
          </span>
          {preview.workstream && (
            <span
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium"
              style={{
                backgroundColor: `${preview.workstream.color}20`,
                color: preview.workstream.color,
              }}
            >
              <Layers className="h-3 w-3" />
              {preview.workstream.code}
            </span>
          )}
          {preview.assignee && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-background border">
              <User className="h-3 w-3" />
              {preview.assignee.name}
            </span>
          )}
          {preview.recurrenceType && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-background border capitalize">
              <Repeat className="h-3 w-3" />
              {preview.recurrenceType}
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            Press <kbd className="px-1 py-0.5 text-[10px] rounded border bg-background">Enter</kbd> to create
          </span>
        </div>
      )}
    </div>
  );
}
