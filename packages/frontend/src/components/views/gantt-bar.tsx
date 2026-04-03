"use client";

import { cn } from "@/lib/utils";

const priorityBarColors: Record<string, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-400",
  Medium: "bg-blue-400",
  Low: "bg-gray-300",
};

interface GanttBarProps {
  task: {
    id: string;
    title: string;
    priority: string;
    status: string;
  };
  left: number;
  width: number;
  isSelected: boolean;
  onClick: (taskId: string) => void;
  mode: "timeline" | "milestone";
}

export function GanttBar({ task, left, width, isSelected, onClick, mode }: GanttBarProps) {
  const colorClass = priorityBarColors[task.priority] || "bg-gray-300";
  const isDone = task.status === "Done";

  if (mode === "milestone") {
    return (
      <div
        className="absolute top-1/2 -translate-y-1/2 cursor-pointer"
        style={{ left: left + width - 8 }}
        onClick={() => onClick(task.id)}
        title={task.title}
      >
        <div
          className={cn(
            "w-4 h-4 rotate-45 border-2",
            colorClass,
            isDone && "opacity-50",
            isSelected && "ring-2 ring-primary ring-offset-1",
          )}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "absolute top-1 bottom-1 rounded cursor-pointer transition-all group",
        colorClass,
        isDone && "opacity-50",
        isSelected && "ring-2 ring-primary ring-offset-1",
      )}
      style={{ left, width: Math.max(width, 16) }}
      onClick={() => onClick(task.id)}
      title={`${task.title}\n${task.priority} priority`}
    >
      {width > 60 && (
        <span className="text-[10px] text-white font-medium px-1.5 truncate block leading-6">
          {task.title}
        </span>
      )}
    </div>
  );
}
