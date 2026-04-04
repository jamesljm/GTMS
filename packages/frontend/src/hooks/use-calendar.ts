import { useState, useMemo, useCallback } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, subMonths, addWeeks, subWeeks,
  addDays, subDays, format, isSameDay, isSameMonth, isToday as isDateToday,
} from "date-fns";

export type CalendarMode = "day" | "week" | "month";

export function useCalendar(tasks: any[]) {
  const [mode, setMode] = useState<CalendarMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigateForward = useCallback(() => {
    setCurrentDate(prev => {
      if (mode === "month") return addMonths(prev, 1);
      if (mode === "week") return addWeeks(prev, 1);
      return addDays(prev, 1);
    });
  }, [mode]);

  const navigateBackward = useCallback(() => {
    setCurrentDate(prev => {
      if (mode === "month") return subMonths(prev, 1);
      if (mode === "week") return subWeeks(prev, 1);
      return subDays(prev, 1);
    });
  }, [mode]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const headerLabel = useMemo(() => {
    if (mode === "month") return format(currentDate, "MMMM yyyy");
    if (mode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    }
    return format(currentDate, "EEEE, MMM d, yyyy");
  }, [mode, currentDate]);

  // Month grid: 6 rows x 7 cols
  const monthGrid = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
    const grid: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      grid.push(days.slice(i, i + 7));
    }
    return grid;
  }, [currentDate]);

  // Week days: 7 days
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [currentDate]);

  // Tasks grouped by date string for fast lookup
  const tasksByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    tasks.forEach(task => {
      if (task.dueDate) {
        const key = format(new Date(task.dueDate), "yyyy-MM-dd");
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(task);
      }
    });
    return map;
  }, [tasks]);

  const getTasksForDate = useCallback((date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    return tasksByDate.get(key) || [];
  }, [tasksByDate]);

  const isCurrentMonth = useCallback((date: Date) => {
    return isSameMonth(date, currentDate);
  }, [currentDate]);

  const isToday = useCallback((date: Date) => {
    return isDateToday(date);
  }, []);

  return {
    mode, setMode,
    currentDate,
    navigateForward, navigateBackward, goToToday,
    headerLabel,
    monthGrid, weekDays,
    tasksByDate, getTasksForDate,
    isCurrentMonth, isToday,
  };
}
