"use client";

import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import { PriorityBadge } from "./priority-badge";
import { StatusBadge } from "./status-badge";
import { WorkstreamBadge } from "./workstream-badge";
import { Paperclip, CheckCircle2, Circle, CornerDownRight } from "lucide-react";
import { getAttachmentUrl } from "@/hooks/use-attachments";
import { cn } from "@/lib/utils";

const priorityColors: Record<string, string> = {
  Critical: "border-l-red-500",
  High: "border-l-orange-400",
  Medium: "border-l-blue-400",
  Low: "border-l-gray-300",
};

const priorityDotColors: Record<string, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-400",
  Medium: "bg-blue-400",
  Low: "bg-gray-300",
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

const acceptanceBadgeStyles: Record<string, string> = {
  Pending: "bg-gray-100 text-gray-600",
  "Changes Requested": "bg-amber-100 text-amber-700",
  Reproposed: "bg-violet-100 text-violet-700",
};

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    status: string;
    priority: string;
    type: string;
    dueDate: string | null;
    acceptanceStatus?: string | null;
    createdAt?: string;
    waitingOnWhom?: string | null;
    workstream?: { code: string; name: string; color: string } | null;
    assignee?: { id: string; name: string } | null;
    parent?: { id: string; title: string } | null;
    subtasks?: { id: string; title: string; status: string; assignee?: { id: string; name: string } | null }[];
    attachments?: { id: string; filename: string; mimeType: string }[];
    _count?: { notes: number; subtasks: number; attachments: number };
  };
  compact?: boolean;
  ultraCompact?: boolean;
  isSelected?: boolean;
  onClick?: (taskId: string) => void;
}

export function TaskCard({ task, compact = false, ultraCompact = false, isSelected = false, onClick }: TaskCardProps) {
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "Done" && task.status !== "Cancelled";
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate));
  const isDraft = task.acceptanceStatus && task.acceptanceStatus !== "Accepted";

  // Ultra compact: minimal single-line card
  if (ultraCompact) {
    return (
      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={() => onClick?.(task.id)}
        onKeyDown={(e) => { if (onClick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick(task.id); } }}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5 rounded-md border transition-colors cursor-pointer",
          isDraft && "border-dashed opacity-70",
          isOverdue && "border-red-200 bg-red-50/30",
          isSelected ? "ring-1 ring-primary bg-primary/5" : "hover:bg-accent/30",
        )}
      >
        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isDraft ? "bg-gray-400" : (priorityDotColors[task.priority] || "bg-gray-300"))} />
        <span className="text-[10px] text-muted-foreground font-mono shrink-0">{task.id.slice(0, 6)}</span>
        <span className={cn("text-xs font-medium truncate flex-1", task.status === "Done" && "line-through text-muted-foreground")}>
          {task.title}
        </span>
        {task.dueDate && (
          <span className={cn("text-[10px] whitespace-nowrap shrink-0", isOverdue ? "text-red-600 font-medium" : "text-muted-foreground")}>
            {format(new Date(task.dueDate), "dd/MM")}
          </span>
        )}
        {task.assignee && (
          <div
            className={cn("h-5 w-5 rounded-full flex items-center justify-center text-white text-[9px] font-medium shrink-0", getAvatarColor(task.assignee.name))}
            title={task.assignee.name}
          >
            {task.assignee.name.charAt(0)}
          </div>
        )}
      </div>
    );
  }

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

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={() => onClick?.(task.id)}
      onKeyDown={(e) => { if (onClick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick(task.id); } }}
      className={cn(
        "block rounded-lg border border-l-4 p-3 transition-colors cursor-pointer",
        priorityColors[task.priority] || "border-l-gray-300",
        isDraft && "border-dashed opacity-70",
        isOverdue && "border-red-200 bg-red-50/30",
        isDueToday && !isOverdue && "border-yellow-200 bg-yellow-50/30",
        isSelected && "ring-2 ring-primary bg-primary/5",
        !isSelected && "hover:bg-accent/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {task.parent && (
            <button
              className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary truncate max-w-full"
              onClick={(e) => { e.stopPropagation(); onClick?.(task.parent!.id); }}
            >
              <CornerDownRight className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{task.parent.title}</span>
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground font-mono shrink-0">{task.id.slice(0, 6)}</span>
            <p className={cn("text-sm font-medium", task.status === "Done" && "line-through text-muted-foreground", compact ? "truncate" : "")}>
              {task.title}
            </p>
          </div>
          {!compact && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} />
              {task.workstream && (
                <WorkstreamBadge code={task.workstream.code} color={task.workstream.color} />
              )}
              {isDraft && task.acceptanceStatus && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-medium inline-flex items-center gap-0.5",
                  acceptanceBadgeStyles[task.acceptanceStatus] || "bg-gray-100 text-gray-600",
                  (task.acceptanceStatus === "Changes Requested" || task.acceptanceStatus === "Reproposed") && "hover:underline cursor-pointer",
                )}>
                  {task.acceptanceStatus}
                  {(task.acceptanceStatus === "Changes Requested" || task.acceptanceStatus === "Reproposed") && (
                    <span className="text-[9px] opacity-70"> - Review</span>
                  )}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {task.createdAt && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {compact ? format(new Date(task.createdAt), "dd MMM") : format(new Date(task.createdAt), "dd MMM yyyy")}
            </span>
          )}
          {task.createdAt && dueDateLabel && (
            <span className="text-muted-foreground text-xs">→</span>
          )}
          {dueDateLabel && (
            <span className={cn("text-xs whitespace-nowrap", isOverdue ? "text-red-600 font-medium" : "text-muted-foreground")}>
              {compact ? (task.dueDate ? format(new Date(task.dueDate), "dd MMM") : "") : dueDateLabel}
            </span>
          )}
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

      {!compact && (totalSubtasks > 0 || totalAttachments > 0) && (
        <div className="flex items-center gap-3 mt-2">
          {totalSubtasks > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" />
              <span>{doneSubtasks}/{totalSubtasks}</span>
              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${totalSubtasks > 0 ? (doneSubtasks / totalSubtasks) * 100 : 0}%` }} />
              </div>
            </div>
          )}
          {totalAttachments > 0 && (
            <div className="flex items-center gap-1">
              {imageAttachments.length > 0 ? (
                <>
                  {imageAttachments.slice(0, 3).map(att => (
                    <img key={att.id} src={getAttachmentUrl(att.id)} alt={att.filename} className="h-6 w-6 rounded object-cover border" />
                  ))}
                  {totalAttachments > 3 && <span className="text-xs text-muted-foreground ml-0.5">+{totalAttachments - 3}</span>}
                </>
              ) : (
                <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Paperclip className="h-3 w-3" /><span>{totalAttachments}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Subtask title list (non-compact only) */}
      {!compact && !ultraCompact && task.subtasks && task.subtasks.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {task.subtasks.slice(0, 3).map((sub) => (
            <button
              key={sub.id}
              className="flex items-center gap-1.5 w-full text-left px-1 py-0.5 rounded hover:bg-accent/50 group"
              onClick={(e) => { e.stopPropagation(); onClick?.(sub.id); }}
            >
              {sub.status === "Done"
                ? <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                : <Circle className="h-3 w-3 text-muted-foreground shrink-0" />
              }
              <span className={cn("text-xs truncate flex-1", sub.status === "Done" && "line-through text-muted-foreground")}>
                {sub.title}
              </span>
              {sub.assignee && (
                <span className={cn("h-4 w-4 rounded-full flex items-center justify-center text-white text-[8px] font-medium shrink-0", getAvatarColor(sub.assignee.name))}>
                  {sub.assignee.name.charAt(0)}
                </span>
              )}
            </button>
          ))}
          {task.subtasks.length > 3 && (
            <span className="text-[10px] text-muted-foreground pl-1">+{task.subtasks.length - 3} more</span>
          )}
        </div>
      )}

      {compact && (totalSubtasks > 0 || totalAttachments > 0) && (
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {totalSubtasks > 0 && <span className="flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> {doneSubtasks}/{totalSubtasks}</span>}
          {totalAttachments > 0 && <span className="flex items-center gap-0.5"><Paperclip className="h-3 w-3" /> {totalAttachments}</span>}
        </div>
      )}

      {task.waitingOnWhom && !compact && (
        <p className="text-xs text-yellow-700 mt-1.5">Waiting on: {task.waitingOnWhom}</p>
      )}
    </div>
  );
}
