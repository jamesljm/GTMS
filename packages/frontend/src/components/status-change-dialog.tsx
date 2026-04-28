"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUsers } from "@/hooks/use-workstreams";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { X, AlertTriangle, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusChangeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { remarks: string; ccUserIds: string[] }) => void;
  status: "Blocked" | "Waiting On";
  loading?: boolean;
}

export function StatusChangeDialog({
  open,
  onClose,
  onConfirm,
  status,
  loading,
}: StatusChangeDialogProps) {
  const [remarks, setRemarks] = useState("");
  const [ccUserIds, setCcUserIds] = useState<string[]>([]);
  const [ccSearch, setCcSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { data: allUsers } = useUsers();

  const isBlocked = status === "Blocked";

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setRemarks("");
      setCcUserIds([]);
      setCcSearch("");
      setShowSuggestions(false);
    }
  }, [open]);

  const filteredSuggestions = (() => {
    const token = ccSearch.toLowerCase().trim();
    if (!token || !allUsers) return [];
    const selectedSet = new Set(ccUserIds);
    return (allUsers as any[])
      .filter(
        (u: any) =>
          !selectedSet.has(u.id) &&
          (u.name?.toLowerCase().includes(token) ||
            u.email?.toLowerCase().includes(token))
      )
      .slice(0, 8);
  })();

  const addCcUser = useCallback(
    (user: any) => {
      setCcUserIds((prev) => [...prev, user.id]);
      setCcSearch("");
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      searchInputRef.current?.focus();
    },
    []
  );

  const removeCcUser = (userId: string) => {
    setCcUserIds((prev) => prev.filter((id) => id !== userId));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) =>
        Math.min(i + 1, filteredSuggestions.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      addCcUser(filteredSuggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedUsers = allUsers
    ? (allUsers as any[]).filter((u: any) => ccUserIds.includes(u.id))
    : [];

  const handleConfirm = () => {
    onConfirm({ remarks: remarks.trim(), ccUserIds });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle
            className={cn(
              "flex items-center gap-2",
              isBlocked ? "text-red-600" : "text-amber-600"
            )}
          >
            {isBlocked ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <Clock className="h-5 w-5" />
            )}
            {isBlocked ? "Task Blocked" : "Task Waiting On"}
          </DialogTitle>
          <DialogDescription>
            {isBlocked
              ? "Describe the blocker so your HOD and task creator can assist."
              : "Describe what you are waiting for so others can follow up."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Remarks */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Remarks <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                isBlocked
                  ? "Describe the blocker and what assistance you need..."
                  : "Describe what you are waiting for and from whom..."
              }
              rows={3}
              className="text-sm"
              autoFocus
            />
          </div>

          {/* CC Users */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              CC additional people (optional)
            </label>

            {/* Selected users as chips */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {selectedUsers.map((u: any) => (
                  <Badge
                    key={u.id}
                    variant="secondary"
                    className="text-xs py-0.5 pl-2 pr-1 gap-1"
                  >
                    {u.name}
                    <button
                      type="button"
                      onClick={() => removeCcUser(u.id)}
                      className="hover:bg-muted rounded-sm p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="relative">
              <Input
                ref={searchInputRef}
                value={ccSearch}
                onChange={(e) => {
                  setCcSearch(e.target.value);
                  setShowSuggestions(true);
                  setHighlightedIndex(-1);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search by name or email..."
                className="h-8 text-sm"
                autoComplete="off"
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto"
                >
                  {filteredSuggestions.map((user: any, idx: number) => (
                    <button
                      key={user.id}
                      type="button"
                      className={cn(
                        "w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center justify-between gap-2",
                        idx === highlightedIndex && "bg-accent"
                      )}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addCcUser(user);
                      }}
                    >
                      <span className="truncate font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Info text */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-2.5">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              HOD and task creator will be notified automatically.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!remarks.trim() || loading}
            className={cn(
              isBlocked
                ? "bg-red-600 hover:bg-red-700"
                : "bg-amber-600 hover:bg-amber-700"
            )}
          >
            {loading ? "Updating..." : `Mark as ${status}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
