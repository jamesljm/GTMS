"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
  color?: string;
}

interface MultiSelectFilterProps {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

export function MultiSelectFilter({ label, options, selected, onChange, className }: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const hasSelection = selected.length > 0;

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 h-9 px-3 rounded-md border text-sm transition-colors hover:bg-accent",
          hasSelection ? "border-primary/50 bg-primary/5" : "border-input",
        )}
      >
        <span className={cn("truncate", hasSelection ? "text-foreground" : "text-muted-foreground")}>
          {hasSelection ? `${label} (${selected.length})` : label}
        </span>
        {hasSelection ? (
          <X className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground" onClick={clearAll} />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 max-h-64 overflow-y-auto bg-white rounded-lg shadow-lg border z-50">
          {options.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No options</div>
          )}
          {options.map(opt => (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-accent cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
              />
              {opt.color && (
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
              )}
              <span className="truncate">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
