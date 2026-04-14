"use client";

import { TaskDetailContent } from "@/components/task-detail-content";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface TaskDetailPanelProps {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  mode?: "overlay" | "pinned";
  onNavigateToTask?: (taskId: string) => void;
}

export function TaskDetailPanel({ taskId, open, onClose, mode = "overlay", onNavigateToTask }: TaskDetailPanelProps) {
  if (mode === "pinned") {
    if (!taskId) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <p className="text-sm">Select a task to view details</p>
        </div>
      );
    }
    return <TaskDetailContent taskId={taskId} onClose={onClose} inline onNavigateToTask={onNavigateToTask} />;
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="overflow-y-auto p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Task Details</SheetTitle>
          <SheetDescription>View and edit task details</SheetDescription>
        </SheetHeader>
        {taskId && <TaskDetailContent taskId={taskId} onClose={onClose} onNavigateToTask={onNavigateToTask} />}
      </SheetContent>
    </Sheet>
  );
}
