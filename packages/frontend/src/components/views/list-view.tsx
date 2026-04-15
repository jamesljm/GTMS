"use client";

import { useMemo, useRef, useEffect } from "react";
import { TaskCard } from "@/components/task-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type GroupBy = "none" | "workstream" | "assignee" | "priority" | "department";

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

  return (
    <div className="space-y-2">
      {grouped ? (
        grouped.map(group => (
          <div key={group.key}>
            <div className="flex items-center gap-2 py-1.5 px-1">
              {group.color && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />}
              <span className="text-sm font-medium">{group.label}</span>
              <span className="text-xs text-muted-foreground">({group.tasks.length})</span>
            </div>
            <div style={gridStyle} className={!isCompact ? "space-y-2" : undefined}>
              {group.tasks.map((task: any) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  ultraCompact={isCompact}
                  isSelected={selectedTaskId === task.id}
                  onClick={onSelectTask}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div style={gridStyle} className={!isCompact ? "space-y-2" : undefined}>
          {tasks.map((task: any) => (
            <TaskCard
              key={task.id}
              task={task}
              ultraCompact={isCompact}
              isSelected={selectedTaskId === task.id}
              onClick={onSelectTask}
            />
          ))}
        </div>
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
