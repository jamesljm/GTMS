"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { TaskCard } from "@/components/task-card";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface KanbanCardProps {
  task: any;
  isSelected: boolean;
  onClick: (taskId: string) => void;
}

export function KanbanCard({ task, isSelected, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "opacity-50",
      )}
    >
      {/* Drag handle */}
      <div
        {...listeners}
        {...attributes}
        className="absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 z-10"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <TaskCard
        task={task}
        compact
        isSelected={isSelected}
        onClick={onClick}
      />
    </div>
  );
}
