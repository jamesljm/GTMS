"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateTask } from "@/hooks/use-tasks";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { TaskCard } from "@/components/task-card";
import { cn } from "@/lib/utils";

const STATUS_COLUMNS = ["Not Started", "In Progress", "Waiting On", "Blocked", "Done"];

interface KanbanViewProps {
  tasks: any[];
  isLoading: boolean;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  groupBy: "status" | "workstream";
  onGroupByChange: (g: "status" | "workstream") => void;
  workstreams: any[];
}

export function KanbanView({
  tasks, isLoading, selectedTaskId, onSelectTask,
  groupBy, onGroupByChange, workstreams,
}: KanbanViewProps) {
  const updateTask = useUpdateTask();
  const [activeTask, setActiveTask] = useState<any>(null);
  const [mobileActiveColumn, setMobileActiveColumn] = useState<string>(
    groupBy === "status" ? STATUS_COLUMNS[0] : ""
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const columns = useMemo(() => {
    if (groupBy === "status") {
      return STATUS_COLUMNS.map(status => ({
        id: status,
        title: status,
        tasks: tasks.filter(t => t.status === status),
      }));
    } else {
      const wsColumns = workstreams.map((ws: any) => ({
        id: ws.id,
        title: `${ws.code} - ${ws.name}`,
        color: ws.color,
        tasks: tasks.filter((t: any) => t.workstreamId === ws.id),
      }));
      const unassigned = tasks.filter((t: any) => !t.workstreamId);
      if (unassigned.length > 0) {
        wsColumns.push({ id: "none", title: "No Workstream", color: "#999", tasks: unassigned });
      }
      return wsColumns;
    }
  }, [tasks, groupBy, workstreams]);

  // Initialize mobile active column for workstream grouping
  useMemo(() => {
    if (groupBy === "workstream" && columns.length > 0 && !columns.find(c => c.id === mobileActiveColumn)) {
      setMobileActiveColumn(columns[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy, columns]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  }, [tasks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const targetColumnId = over.id as string;

    if (groupBy === "status") {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== targetColumnId) {
        updateTask.mutate({ id: taskId, status: targetColumnId });
      }
    } else {
      const task = tasks.find(t => t.id === taskId);
      const newWsId = targetColumnId === "none" ? null : targetColumnId;
      if (task && task.workstreamId !== newWsId) {
        updateTask.mutate({ id: taskId, workstreamId: newWsId });
      }
    }
  }, [tasks, groupBy, updateTask]);

  const handleMobileMove = useCallback((taskId: string, targetId: string) => {
    if (groupBy === "status") {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== targetId) {
        updateTask.mutate({ id: taskId, status: targetId });
      }
    } else {
      const task = tasks.find(t => t.id === taskId);
      const newWsId = targetId === "none" ? null : targetId;
      if (task && task.workstreamId !== newWsId) {
        updateTask.mutate({ id: taskId, workstreamId: newWsId });
      }
    }
  }, [tasks, groupBy, updateTask]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const mobileColumn = columns.find(c => c.id === mobileActiveColumn);

  return (
    <div>
      {/* Group by selector */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-muted-foreground">Group by:</span>
        <Select value={groupBy} onValueChange={(v) => {
          onGroupByChange(v as "status" | "workstream");
          if (v === "status") setMobileActiveColumn(STATUS_COLUMNS[0]);
        }}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="workstream">Workstream</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile: single column with tabs */}
      <div className="md:hidden">
        {/* Column tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-3 scrollbar-hide">
          {columns.map(col => (
            <button
              key={col.id}
              onClick={() => setMobileActiveColumn(col.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors min-h-[36px]",
                mobileActiveColumn === col.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {(col as any).color && (
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: (col as any).color }} />
              )}
              {col.title}
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px]",
                mobileActiveColumn === col.id
                  ? "bg-primary-foreground/20"
                  : "bg-background"
              )}>
                {col.tasks.length}
              </span>
            </button>
          ))}
        </div>

        {/* Cards for active column */}
        {mobileColumn && (
          <div className="space-y-2">
            {mobileColumn.tasks.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-8">
                No tasks
              </div>
            )}
            {mobileColumn.tasks.map(task => (
              <div key={task.id} className="relative">
                <TaskCard
                  task={task}
                  compact
                  isSelected={selectedTaskId === task.id}
                  onClick={onSelectTask}
                />
                {/* Move to... selector */}
                <div className="mt-1">
                  <Select
                    value=""
                    onValueChange={(v) => handleMobileMove(task.id, v)}
                  >
                    <SelectTrigger className="h-7 text-[11px] text-muted-foreground w-full">
                      <span>Move to...</span>
                    </SelectTrigger>
                    <SelectContent>
                      {columns
                        .filter(c => c.id !== mobileActiveColumn)
                        .map(c => (
                          <SelectItem key={c.id} value={c.id} className="text-xs">
                            {c.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop: full kanban board with drag-and-drop */}
      <div className="hidden md:block">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
            {columns.map(col => (
              <KanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                count={col.tasks.length}
                color={(col as any).color}
              >
                {col.tasks.map(task => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    isSelected={selectedTaskId === task.id}
                    onClick={onSelectTask}
                  />
                ))}
              </KanbanColumn>
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="opacity-80 rotate-2">
                <KanbanCard task={activeTask} isSelected={false} onClick={() => {}} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
