"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { TaskCard } from "@/components/task-card";
import { StatusBadge } from "@/components/status-badge";
import { WorkstreamBadge } from "@/components/workstream-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Paperclip, CornerDownRight, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";

type GroupBy = "none" | "workstream" | "assignee" | "priority" | "department";

const priorityDot: Record<string, string> = {
  Critical: "bg-rose-500",
  High: "bg-amber-500",
  Medium: "bg-blue-500",
  Low: "bg-slate-400",
};

const avatarColors = [
  "bg-blue-500/90", "bg-emerald-500/90", "bg-violet-500/90", "bg-orange-500/90",
  "bg-pink-500/90", "bg-teal-500/90", "bg-indigo-500/90", "bg-amber-500/90",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// Order a flat task list so subtasks sit directly under their parent (indented).
// Subtasks whose parent isn't in the current list stay at top level (as a fallback).
function organizeWithSubtasks(list: any[]): { task: any; depth: number }[] {
  const ids = new Set(list.map((t) => t.id));
  const childrenByParent = new Map<string, any[]>();
  for (const t of list) {
    if (t.parent && ids.has(t.parent.id)) {
      const arr = childrenByParent.get(t.parent.id) || [];
      arr.push(t);
      childrenByParent.set(t.parent.id, arr);
    }
  }
  const out: { task: any; depth: number }[] = [];
  for (const t of list) {
    if (t.parent && ids.has(t.parent.id)) continue; // rendered under its parent instead
    out.push({ task: t, depth: 0 });
    for (const child of childrenByParent.get(t.id) || []) {
      out.push({ task: child, depth: 1 });
    }
  }
  return out;
}

function ListRow({ task, isSelected, onClick, nested = false, expandable = false, collapsed = false, onToggle }: { task: any; isSelected: boolean; onClick: (id: string) => void; nested?: boolean; expandable?: boolean; collapsed?: boolean; onToggle?: () => void }) {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isDone = task.status === "Done" || task.status === "Cancelled";
  const overdue = !!dueDate && isPast(dueDate) && !isToday(dueDate) && !isDone;
  const dueToday = !!dueDate && isToday(dueDate);
  const isDraft = task.acceptanceStatus && task.acceptanceStatus !== "Accepted";
  const doneSub = task.subtasks?.filter((s: any) => s.status === "Done").length ?? 0;
  const totalSub = task.subtasks?.length ?? task._count?.subtasks ?? 0;
  const attachments = task.attachments?.length ?? task._count?.attachments ?? 0;

  return (
    <button
      type="button"
      onClick={() => onClick(task.id)}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
        isDraft && "opacity-70",
        isSelected ? "border-primary/50 bg-accent" : "border-border bg-card hover:bg-accent/50"
      )}
    >
      {expandable ? (
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
          className="grid h-4 w-4 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          title={collapsed ? "Expand subtasks" : "Collapse subtasks"}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      ) : nested ? (
        <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
      ) : (
        <span className="w-4 shrink-0" />
      )}
      <span
        className={cn("h-2 w-2 shrink-0 rounded-full", priorityDot[task.priority] || "bg-slate-400")}
        title={task.priority}
      />

      <div className="min-w-0 flex-1">
        {task.parent && !nested && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <CornerDownRight className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{task.parent.title}</span>
          </span>
        )}
        <p className={cn("truncate font-medium", nested ? "text-[13px]" : "text-sm", isDone && "text-muted-foreground line-through")}>
          {task.title}
        </p>
      </div>

      {totalSub > 0 && (
        <span className="hidden shrink-0 items-center gap-1 text-[11px] text-muted-foreground sm:flex">
          <CheckCircle2 className="h-3 w-3" />{doneSub}/{totalSub}
        </span>
      )}
      {attachments > 0 && (
        <span className="hidden shrink-0 items-center gap-0.5 text-[11px] text-muted-foreground sm:flex">
          <Paperclip className="h-3 w-3" />{attachments}
        </span>
      )}
      {task.workstream && (
        <span className="hidden shrink-0 md:inline-flex">
          <WorkstreamBadge code={task.workstream.code} color={task.workstream.color} />
        </span>
      )}
      <span className="hidden shrink-0 sm:inline-flex">
        <StatusBadge status={task.status} />
      </span>
      {dueDate && (
        <span
          className={cn(
            "shrink-0 whitespace-nowrap text-xs",
            overdue ? "font-medium text-red-500" : dueToday ? "font-medium text-amber-500" : "text-muted-foreground"
          )}
        >
          {overdue ? "Overdue" : dueToday ? "Today" : format(dueDate, "d MMM")}
        </span>
      )}
      {task.assignee && (
        <span
          className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white", avatarColor(task.assignee.name))}
          title={task.assignee.name}
        >
          {initials(task.assignee.name)}
        </span>
      )}
    </button>
  );
}

interface ListViewProps {
  tasks: any[];
  pagination?: { page: number; totalPages: number; total: number };
  isLoading: boolean;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onPageChange: (page: number) => void;
  groupBy?: GroupBy;
  workstreams?: any[];
  viewDensity?: "default" | "compact";
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

export function ListView({ tasks, pagination, isLoading, selectedTaskId, onSelectTask, onPageChange, groupBy = "none", workstreams = [], viewDensity = "default", hasNextPage, isFetchingNextPage, onLoadMore }: ListViewProps) {
  const isCompact = viewDensity === "compact";
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Collapsed parent ids (subtasks hidden). Empty = all expanded.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleCollapsed = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const parentIdsWithChildren = useMemo(() => {
    const ids = new Set(tasks.map((t: any) => t.id));
    const s = new Set<string>();
    for (const t of tasks) if (t.parent && ids.has(t.parent.id)) s.add(t.parent.id);
    return s;
  }, [tasks]);
  const anyExpanded = useMemo(
    () => [...parentIdsWithChildren].some((id) => !collapsed.has(id)),
    [parentIdsWithChildren, collapsed]
  );

  // Infinite scroll observer
  useEffect(() => {
    if (!isCompact || !onLoadMore || !hasNextPage) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isCompact, onLoadMore, hasNextPage, isFetchingNextPage]);

  const grouped = useMemo(() => {
    if (groupBy === "none") return null;

    const groups = new Map<string, { label: string; color?: string; tasks: any[] }>();

    tasks.forEach(task => {
      let key: string;
      let label: string;
      let color: string | undefined;

      if (groupBy === "workstream") {
        key = task.workstream?.code || "none";
        label = task.workstream ? `${task.workstream.code} - ${task.workstream.name}` : "No Workstream";
        color = task.workstream?.color;
      } else if (groupBy === "department") {
        const dept = task.workstream?.department;
        key = dept?.id || "none";
        label = dept ? `${dept.code} - ${dept.name}` : "No Department";
        color = dept?.color;
      } else if (groupBy === "assignee") {
        key = task.assignee?.id || "unassigned";
        label = task.assignee?.name || "Unassigned";
      } else {
        key = task.priority || "none";
        label = task.priority || "No Priority";
        const priorityColors: Record<string, string> = { Critical: "#ef4444", High: "#f97316", Medium: "#3b82f6", Low: "#9ca3af" };
        color = priorityColors[key];
      }

      if (!groups.has(key)) {
        groups.set(key, { label, color, tasks: [] });
      }
      groups.get(key)!.tasks.push(task);
    });

    return Array.from(groups.entries()).map(([key, g]) => ({ key, ...g }));
  }, [tasks, groupBy]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!tasks?.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No tasks found matching your filters.
        </CardContent>
      </Card>
    );
  }

  const gridStyle = isCompact
    ? { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "6px" }
    : undefined;

  const useInfiniteScroll = isCompact && !!onLoadMore;

  const renderTasks = (list: any[]) => {
    if (isCompact) {
      // Grid can't nest/indent — hide subtasks whose parent is present (show parents only).
      // Subtasks whose parent isn't in the list stay visible as a fallback.
      const ids = new Set(list.map((t: any) => t.id));
      const visible = list.filter((t: any) => !(t.parent && ids.has(t.parent.id)));
      return (
        <div style={gridStyle}>
          {visible.map((task: any) => (
            <TaskCard key={task.id} task={task} ultraCompact isSelected={selectedTaskId === task.id} onClick={onSelectTask} />
          ))}
        </div>
      );
    }
    const organized = organizeWithSubtasks(list);
    const localParents = new Set(organized.filter((o) => o.depth > 0).map((o) => o.task.parent.id));
    return (
      <div className="space-y-1">
        {organized.map(({ task, depth }) => {
          if (depth > 0 && collapsed.has(task.parent.id)) return null;
          const expandable = depth === 0 && localParents.has(task.id);
          return (
            <div key={task.id} style={depth ? { marginLeft: depth * 22 } : undefined}>
              <ListRow
                task={task}
                nested={depth > 0}
                expandable={expandable}
                collapsed={collapsed.has(task.id)}
                onToggle={() => toggleCollapsed(task.id)}
                isSelected={selectedTaskId === task.id}
                onClick={onSelectTask}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {!isCompact && parentIdsWithChildren.size > 0 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground"
            onClick={() => setCollapsed(anyExpanded ? new Set(parentIdsWithChildren) : new Set())}
          >
            {anyExpanded ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
            {anyExpanded ? "Collapse all" : "Expand all"}
          </Button>
        </div>
      )}
      {grouped ? (
        grouped.map(group => (
          <div key={group.key}>
            <div className="flex items-center gap-2 py-1.5 px-1">
              {group.color && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />}
              <span className="text-sm font-medium">{group.label}</span>
              <span className="text-xs text-muted-foreground">({group.tasks.length})</span>
            </div>
            {renderTasks(group.tasks)}
          </div>
        ))
      ) : (
        renderTasks(tasks)
      )}

      {/* Infinite scroll sentinel */}
      {useInfiniteScroll && (
        <>
          <div ref={sentinelRef} className="h-1" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            </div>
          )}
        </>
      )}

      {/* Traditional pagination (non-compact only) */}
      {!useInfiniteScroll && pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {pagination.page} / {pagination.totalPages} ({pagination.total} tasks)
          </span>
          <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
