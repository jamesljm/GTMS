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

const STATUS_COLUMNS = ["Not Started", "In Progress", "Waiting On", "Blocked"];

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

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* Group by selector */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-muted-foreground">Group by:</span>
        <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as "status" | "workstream")}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="workstream">Workstream</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kanban board */}
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
  );
}
