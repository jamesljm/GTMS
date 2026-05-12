"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  color?: string;
  children: React.ReactNode;
}

export function KanbanColumn({ id, title, count, color, children }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border min-w-[280px] w-[280px] shrink-0 transition-colors",
        isOver && "border-primary bg-primary/5",
      )}
    >
      {/* Column header — sticky to top of column */}
      <div className="sticky top-0 z-10 flex items-center justify-between p-3 pb-2 bg-muted/95 backdrop-blur rounded-t-lg border-b">
        <div className="flex items-center gap-2">
          {color && (
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          )}
          <h3 className="text-sm font-medium truncate">{title}</h3>
        </div>
        <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-0.5">
          {count}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-muted/30 rounded-b-lg" style={{ maxHeight: "calc(100vh - 300px)" }}>
        {children}
        {count === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}
