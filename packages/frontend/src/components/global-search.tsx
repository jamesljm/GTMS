"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Search, X, Loader2, CornerDownLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { WorkstreamBadge } from "@/components/workstream-badge";
import { cn } from "@/lib/utils";

function useDebounced(value: string, delay = 200) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function highlight(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (!query || idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-[2px] bg-primary/15 px-0.5 text-primary">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const debounced = useDebounced(query.trim(), 200);
  const enabled = debounced.length >= 2;

  const { data, isFetching } = useQuery({
    queryKey: ["global-search", debounced],
    queryFn: () => api.get("/tasks", { params: { search: debounced, limit: 7 } }).then((r) => r.data),
    enabled,
    staleTime: 30_000,
  });

  const results: any[] = enabled && data?.tasks ? data.tasks : [];
  const total: number = data?.pagination?.total ?? results.length;

  // Close when clicking outside
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Reset highlight when the query changes
  useEffect(() => setActiveIndex(-1), [debounced]);

  const goToAll = () => {
    if (!query.trim()) return;
    setOpen(false);
    router.push(`/tasks?search=${encodeURIComponent(query.trim())}`);
  };

  const goToTask = (id: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/tasks/${id}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) goToTask(results[activeIndex].id);
      else goToAll();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showPanel = open && enabled;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search tasks..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        onKeyDown={onKeyDown}
        className="h-9 pl-9 pr-8 text-sm"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setOpen(false);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border bg-popover shadow-lg shadow-black/5">
          {isFetching && results.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No tasks match <span className="font-medium text-foreground">&ldquo;{debounced}&rdquo;</span>
            </div>
          ) : (
            <>
              <ul className="max-h-[22rem] overflow-y-auto py-1">
                {results.map((task, i) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => goToTask(task.id)}
                      className={cn(
                        "flex w-full items-start gap-3 px-3 py-2 text-left transition-colors",
                        i === activeIndex ? "bg-accent" : "hover:bg-accent/50"
                      )}
                    >
                      <Search className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {highlight(task.title, debounced)}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {task.id.slice(0, 6)}
                          </span>
                          <StatusBadge status={task.status} />
                          {task.workstream && (
                            <WorkstreamBadge code={task.workstream.code} color={task.workstream.color} />
                          )}
                          {task.assignee && (
                            <span className="truncate text-[11px] text-muted-foreground">
                              · {task.assignee.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={goToAll}
                onMouseEnter={() => setActiveIndex(-1)}
                className={cn(
                  "flex w-full items-center justify-between border-t px-3 py-2.5 text-xs transition-colors",
                  activeIndex === -1 ? "bg-accent/60" : "hover:bg-accent/50"
                )}
              >
                <span className="text-muted-foreground">
                  See all {total > results.length ? `${total} ` : ""}results for{" "}
                  <span className="font-medium text-foreground">&ldquo;{query.trim()}&rdquo;</span>
                </span>
                <kbd className="flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  <CornerDownLeft className="h-3 w-3" /> Enter
                </kbd>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
