"use client";

import { cn } from "@/lib/utils";

const priorityDotColors: Record<string, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-400",
  Medium: "bg-blue-400",
  Low: "bg-gray-300",
};

interface CalendarTaskPillProps {
  task: any;
  isSelected: boolean;
  onClick: (taskId: string) => void;
}

export function CalendarTaskPill({ task, isSelected, onClick }: CalendarTaskPillProps) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(task.id); }}
      className={cn(
        "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs cursor-pointer hover:bg-accent/50 truncate transition-colors",
        isSelected && "bg-primary/10 ring-1 ring-primary",
        task.status === "Done" && "opacity-50 line-through",
      )}
    >
      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityDotColors[task.priority] || "bg-gray-300")} />
      <span className="truncate">{task.title}</span>
    </div>
  );
}
