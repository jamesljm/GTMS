"use client";

import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import { PriorityBadge } from "./priority-badge";
import { StatusBadge } from "./status-badge";
import { WorkstreamBadge } from "./workstream-badge";
import { Paperclip, CheckCircle2 } from "lucide-react";
import { getAttachmentUrl } from "@/hooks/use-attachments";
import { cn } from "@/lib/utils";

const priorityColors: Record<string, string> = {
  Critical: "border-l-red-500",
  High: "border-l-orange-400",
  Medium: "border-l-blue-400",
  Low: "border-l-gray-300",
};

const avatarColors = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
  "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-amber-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

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
    subtasks?: { id: string; title: string; status: string }[];
    attachments?: { id: string; filename: string; mimeType: string }[];
    _count?: { notes: number; subtasks: number; attachments: number };
  };
  compact?: boolean;
  isSelected?: boolean;
  onClick?: (taskId: string) => void;
}

export function TaskCard({ task, compact = false, isSelected = false, onClick }: TaskCardProps) {
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "Done" && task.status !== "Cancelled";
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate));

  const doneSubtasks = task.subtasks?.filter(s => s.status === "Done").length ?? 0;
  const totalSubtasks = task.subtasks?.length ?? task._count?.subtasks ?? 0;

  const imageAttachments = task.attachments?.filter(a => a.mimeType.startsWith("image/")) ?? [];
  const totalAttachments = task.attachments?.length ?? task._count?.attachments ?? 0;

  const dueDateLabel = task.dueDate
    ? isOverdue
      ? formatDistanceToNow(new Date(task.dueDate), { addSuffix: false }) + " overdue"
      : isDueToday
        ? "Due today"
        : "Due " + formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })
    : null;

  const Wrapper = onClick ? "div" : "div";

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={() => onClick?.(task.id)}
      onKeyDown={(e) => { if (onClick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick(task.id); } }}
      className={cn(
        "block rounded-lg border border-l-4 p-3 transition-colors cursor-pointer",
        priorityColors[task.priority] || "border-l-gray-300",
        isOverdue && "border-red-200 bg-red-50/30",
        isDueToday && !isOverdue && "border-yellow-200 bg-yellow-50/30",
        isSelected && "ring-2 ring-primary bg-primary/5",
        !isSelected && "hover:bg-accent/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium", task.status === "Done" && "line-through text-muted-foreground", compact ? "truncate" : "")}>
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
        <div className="flex items-center gap-2 shrink-0">
          {/* Due date */}
          {dueDateLabel && (
            <span className={cn("text-xs whitespace-nowrap", isOverdue ? "text-red-600 font-medium" : "text-muted-foreground")}>
              {compact ? (task.dueDate ? format(new Date(task.dueDate), "dd MMM") : "") : dueDateLabel}
            </span>
          )}
          {/* Assignee avatar */}
          {task.assignee && (
            <div
              className={cn("h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium shrink-0", getAvatarColor(task.assignee.name))}
              title={task.assignee.name}
            >
              {getInitials(task.assignee.name)}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: subtasks + attachments */}
      {!compact && (totalSubtasks > 0 || totalAttachments > 0) && (
        <div className="flex items-center gap-3 mt-2">
          {/* Subtask progress */}
          {totalSubtasks > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" />
              <span>{doneSubtasks}/{totalSubtasks}</span>
              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${totalSubtasks > 0 ? (doneSubtasks / totalSubtasks) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
          {/* Attachment thumbnails */}
          {totalAttachments > 0 && (
            <div className="flex items-center gap-1">
              {imageAttachments.length > 0 ? (
                <>
                  {imageAttachments.slice(0, 3).map(att => (
                    <img
                      key={att.id}
                      src={getAttachmentUrl(att.id)}
                      alt={att.filename}
                      className="h-6 w-6 rounded object-cover border"
                    />
                  ))}
                  {totalAttachments > 3 && (
                    <span className="text-xs text-muted-foreground ml-0.5">+{totalAttachments - 3}</span>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Paperclip className="h-3 w-3" />
                  <span>{totalAttachments}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Compact mode: just show counts inline */}
      {compact && (totalSubtasks > 0 || totalAttachments > 0) && (
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {totalSubtasks > 0 && (
            <span className="flex items-center gap-0.5">
              <CheckCircle2 className="h-3 w-3" /> {doneSubtasks}/{totalSubtasks}
            </span>
          )}
          {totalAttachments > 0 && (
            <span className="flex items-center gap-0.5">
              <Paperclip className="h-3 w-3" /> {totalAttachments}
            </span>
          )}
        </div>
      )}

      {/* Waiting on indicator */}
      {task.waitingOnWhom && !compact && (
        <p className="text-xs text-yellow-700 mt-1.5">Waiting on: {task.waitingOnWhom}</p>
      )}
    </div>
  );
}
