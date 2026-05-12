"use client";

import { format } from "date-fns";
import { useCalendar, CalendarMode } from "@/hooks/use-calendar";
import { CalendarTaskPill } from "./calendar-task-pill";
import { TaskCard } from "@/components/task-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
  tasks: any[];
  isLoading: boolean;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onCreateOnDate?: (date: Date) => void;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES_SHORT = ["M", "T", "W", "T", "F", "S", "S"];

export function CalendarView({ tasks, isLoading, selectedTaskId, onSelectTask, onCreateOnDate }: CalendarViewProps) {
  const {
    mode, setMode,
    navigateForward, navigateBackward, goToToday,
    headerLabel,
    monthGrid, weekDays,
    getTasksForDate, isCurrentMonth, isToday, currentDate,
  } = useCalendar(tasks);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-2 sm:gap-3 mb-3">
        <Select value={mode} onValueChange={(v) => setMode(v as CalendarMode)}>
          <SelectTrigger className="w-[90px] sm:w-[100px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="day">Day</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={navigateBackward}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3 text-xs sm:text-sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={navigateForward}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-xs sm:text-sm font-medium truncate">{headerLabel}</span>
      </div>

      {/* Month view */}
      {mode === "month" && (
        <div className="border rounded-lg overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7">
            {DAY_NAMES.map((d, i) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1.5 sm:py-2 border-b bg-muted/30">
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{DAY_NAMES_SHORT[i]}</span>
              </div>
            ))}
          </div>
          {/* Grid */}
          {monthGrid.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((date, di) => {
                const dayTasks = getTasksForDate(date);
                const today = isToday(date);
                const currentMo = isCurrentMonth(date);
                // Show 2 pills on mobile, 3 on desktop
                const maxPills = typeof window !== "undefined" && window.innerWidth < 640 ? 2 : 3;
                return (
                  <div
                    key={di}
                    className={cn(
                      "min-h-[60px] sm:min-h-[100px] border-b border-r p-1 sm:p-1.5 transition-colors",
                      !currentMo && "opacity-40 bg-muted/10",
                      today && "bg-primary/5 ring-1 ring-inset ring-primary/30",
                      onCreateOnDate && "cursor-pointer hover:bg-muted/30",
                    )}
                    onClick={() => onCreateOnDate?.(date)}
                    title={onCreateOnDate ? "Click to add a task on this day" : undefined}
                  >
                    <div className={cn("text-xs mb-0.5 sm:mb-1", today ? "font-bold text-primary" : "text-muted-foreground")}>
                      {format(date, "d")}
                    </div>
                    <div className="space-y-0.5">
                      {dayTasks.slice(0, maxPills).map((task: any) => (
                        <div key={task.id} onClick={(e) => e.stopPropagation()}>
                          <CalendarTaskPill
                            task={task}
                            isSelected={selectedTaskId === task.id}
                            onClick={onSelectTask}
                          />
                        </div>
                      ))}
                      {dayTasks.length > maxPills && (
                        <span className="text-[10px] text-muted-foreground px-1 sm:px-1.5">+{dayTasks.length - maxPills} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Week view */}
      {mode === "week" && (
        <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 min-w-[560px]">
            {weekDays.map((day, i) => {
              const dayTasks = getTasksForDate(day);
              const today = isToday(day);
              return (
                <div key={i} className={cn("border rounded-lg overflow-hidden", today && "ring-1 ring-primary/50")}>
                  <div className={cn(
                    "text-center py-1.5 sm:py-2 border-b text-xs sm:text-sm font-medium",
                    today ? "bg-primary/10 text-primary" : "bg-muted/30",
                  )}>
                    {format(day, "EEE d")}
                  </div>
                  <div className="p-1 sm:p-1.5 space-y-1 sm:space-y-1.5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 320px)" }}>
                    {dayTasks.length === 0 && (
                      <p className="text-[10px] text-muted-foreground text-center py-2">No tasks</p>
                    )}
                    {dayTasks.map((task: any) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        compact
                        isSelected={selectedTaskId === task.id}
                        onClick={onSelectTask}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day view */}
      {mode === "day" && (() => {
        const dayTasks = getTasksForDate(currentDate);
        return (
          <div className="border rounded-lg overflow-hidden">
            <div className="p-3 bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground">
                {format(currentDate, "EEEE, d MMMM yyyy")} ({dayTasks.length} tasks)
              </span>
              <div className="space-y-1.5 mt-2">
                {dayTasks.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tasks due on this day</p>
                )}
                {dayTasks.map((task: any) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    compact
                    isSelected={selectedTaskId === task.id}
                    onClick={onSelectTask}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
