import Link from "next/link";
import { format, isPast, isToday } from "date-fns";
import { PriorityBadge } from "./priority-badge";
import { StatusBadge } from "./status-badge";
import { WorkstreamBadge } from "./workstream-badge";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    status: string;
    priority: string;
    type: string;
    dueDate: string | null;
    waitingOnWhom?: string | null;
    workstream?: { code: string; name: string; color: string } | null;
    assignee?: { id: string; name: string } | null;
    _count?: { notes: number; subtasks: number };
  };
  compact?: boolean;
}

export function TaskCard({ task, compact = false }: TaskCardProps) {
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "Done" && task.status !== "Cancelled";
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate));

  return (
    <Link
      href={`/tasks/${task.id}`}
      className={cn(
        "block rounded-lg border p-3 hover:bg-accent/50 transition-colors",
        isOverdue && "border-red-300 bg-red-50/50",
        isDueToday && !isOverdue && "border-yellow-300 bg-yellow-50/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium truncate", task.status === "Done" && "line-through text-muted-foreground")}>
            {task.title}
          </p>
          {!compact && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} />
              {task.workstream && (
                <WorkstreamBadge code={task.workstream.code} color={task.workstream.color} />
              )}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          {task.dueDate && (
            <p className={cn("text-xs", isOverdue ? "text-red-600 font-medium" : "text-muted-foreground")}>
              {format(new Date(task.dueDate), "dd MMM")}
            </p>
          )}
          {task.assignee && (
            <p className="text-xs text-muted-foreground mt-0.5">{task.assignee.name.split(" ")[0]}</p>
          )}
        </div>
      </div>
      {task.waitingOnWhom && (
        <p className="text-xs text-yellow-700 mt-1">Waiting on: {task.waitingOnWhom}</p>
      )}
    </Link>
  );
}
