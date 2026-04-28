"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useGantt, ZoomLevel } from "@/hooks/use-gantt";
import { GanttBar } from "./gantt-bar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface GanttViewProps {
  tasks: any[];
  isLoading: boolean;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  workstreams: any[];
}

type GanttMode = "timeline" | "milestone";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export function GanttView({ tasks, isLoading, selectedTaskId, onSelectTask, workstreams }: GanttViewProps) {
  const { zoom, setZoom, config } = useGantt(tasks);
  const [mode, setMode] = useState<GanttMode>("timeline");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const ROW_HEIGHT = isMobile ? 28 : 32;
  const LABEL_WIDTH = isMobile ? 100 : 240;

  // Group tasks by workstream
  const groups = useMemo(() => {
    const wsMap = new Map<string, { label: string; color: string; tasks: any[] }>();

    workstreams.forEach((ws: any) => {
      wsMap.set(ws.id, { label: `${ws.code} - ${ws.name}`, color: ws.color, tasks: [] });
    });
    wsMap.set("none", { label: "No Workstream", color: "#999", tasks: [] });

    tasks.forEach(t => {
      const key = t.workstreamId || "none";
      if (!wsMap.has(key)) {
        wsMap.set(key, { label: key, color: "#999", tasks: [] });
      }
      wsMap.get(key)!.tasks.push(t);
    });

    return Array.from(wsMap.entries())
      .filter(([_, g]) => g.tasks.length > 0)
      .map(([id, g]) => ({ id, ...g }));
  }, [tasks, workstreams]);

  const toggleGroup = (id: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Calculate total visible rows
  const rows: { type: "group" | "task"; id: string; label: string; color?: string; task?: any }[] = [];
  groups.forEach(g => {
    rows.push({ type: "group", id: g.id, label: g.label, color: g.color });
    if (!collapsedGroups.has(g.id)) {
      g.tasks.forEach(t => {
        rows.push({ type: "task", id: t.id, label: t.title, task: t });
      });
    }
  });

  const totalWidth = config.columns.length * config.columnWidth;
  const todayPos = config.getTodayPosition();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!tasks.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No tasks to display in Gantt chart.
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Mode:</span>
          <Select value={mode} onValueChange={(v) => setMode(v as GanttMode)}>
            <SelectTrigger className="w-[100px] sm:w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="timeline">Timeline</SelectItem>
              <SelectItem value="milestone">Milestone</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Zoom:</span>
          <div className="flex gap-1">
            {(["day", "week", "month"] as ZoomLevel[]).map(z => (
              <Button
                key={z}
                size="sm"
                variant={zoom === z ? "default" : "outline"}
                className="h-7 text-xs px-2"
                onClick={() => setZoom(z)}
              >
                {z.charAt(0).toUpperCase() + z.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Gantt chart */}
      <div className="border rounded-lg overflow-hidden">
        <div className="flex overflow-x-auto">
          {/* Left: labels */}
          <div className="shrink-0 border-r bg-muted/30" style={{ width: LABEL_WIDTH }}>
            {/* Header */}
            <div className="h-8 border-b px-2 sm:px-3 flex items-center text-xs font-medium text-muted-foreground">
              Task
            </div>
            {/* Rows */}
            {rows.map(row => (
              <div
                key={row.id}
                className={cn(
                  "border-b flex items-center px-1.5 sm:px-2 text-sm cursor-pointer hover:bg-accent/50 min-h-[44px] sm:min-h-0",
                  row.type === "group" && "bg-muted/50 font-medium",
                  row.type === "task" && selectedTaskId === row.id && "bg-primary/5",
                )}
                style={{ height: ROW_HEIGHT }}
                onClick={() => {
                  if (row.type === "group") toggleGroup(row.id);
                  else if (row.task) onSelectTask(row.task.id);
                }}
              >
                {row.type === "group" ? (
                  <>
                    {collapsedGroups.has(row.id) ? (
                      <ChevronRight className="h-3.5 w-3.5 mr-1 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 mr-1 text-muted-foreground shrink-0" />
                    )}
                    {row.color && <div className="w-2 h-2 rounded-full mr-1 sm:mr-1.5 shrink-0" style={{ backgroundColor: row.color }} />}
                    <span className="text-xs truncate">{isMobile ? (row.label.split(" - ")[0] || row.label) : row.label}</span>
                  </>
                ) : (
                  <span className="text-xs truncate pl-3 sm:pl-5">{row.label}</span>
                )}
              </div>
            ))}
          </div>

          {/* Right: timeline */}
          <div className="flex-1 overflow-x-auto" ref={scrollRef}>
            <div style={{ width: totalWidth, minWidth: "100%" }}>
              {/* Column headers */}
              <div className="h-8 border-b flex">
                {config.columns.map((col, i) => (
                  <div
                    key={i}
                    className={cn(
                      "border-r text-[10px] text-muted-foreground flex items-center justify-center shrink-0",
                      col.isToday && "bg-red-50 dark:bg-red-950/30 font-medium text-red-600",
                    )}
                    style={{ width: config.columnWidth }}
                  >
                    {col.label}
                  </div>
                ))}
              </div>

              {/* Rows with bars */}
              {rows.map(row => (
                <div
                  key={row.id}
                  className={cn(
                    "border-b relative",
                    row.type === "group" && "bg-muted/20",
                  )}
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Column grid lines */}
                  {config.columns.map((col, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-r border-muted/30"
                      style={{ left: i * config.columnWidth, width: config.columnWidth }}
                    />
                  ))}

                  {/* Today marker */}
                  {todayPos !== null && todayPos >= 0 && todayPos <= totalWidth && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-red-400 z-10"
                      style={{ left: todayPos }}
                    />
                  )}

                  {/* Task bar */}
                  {row.type === "task" && row.task && (() => {
                    const pos = config.getBarPosition(row.task);
                    if (!pos) return null;
                    return (
                      <GanttBar
                        task={row.task}
                        left={pos.left}
                        width={pos.width}
                        isSelected={selectedTaskId === row.task.id}
                        onClick={onSelectTask}
                        mode={mode}
                      />
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll hint on mobile */}
      <p className="text-[10px] text-muted-foreground mt-1.5 sm:hidden">
        Swipe left/right to scroll the timeline
      </p>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1"><div className="w-3 h-2 bg-red-500 rounded" /> Critical</div>
        <div className="flex items-center gap-1"><div className="w-3 h-2 bg-orange-400 rounded" /> High</div>
        <div className="flex items-center gap-1"><div className="w-3 h-2 bg-blue-400 rounded" /> Medium</div>
        <div className="flex items-center gap-1"><div className="w-3 h-2 bg-gray-300 rounded" /> Low</div>
        <div className="flex items-center gap-1"><div className="w-px h-3 bg-red-400" /> Today</div>
      </div>
    </div>
  );
}
