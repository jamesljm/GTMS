import { useMemo, useState } from "react";
import {
  addDays, addWeeks, addMonths, differenceInDays, differenceInWeeks,
  startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth,
  format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  isToday, isSameDay,
} from "date-fns";

export type ZoomLevel = "day" | "week" | "month";

interface GanttTask {
  id: string;
  title: string;
  priority: string;
  status: string;
  createdAt: string;
  dueDate: string | null;
  workstreamId?: string | null;
  workstream?: { code: string; name: string; color: string } | null;
}

interface GanttConfig {
  startDate: Date;
  endDate: Date;
  columns: { date: Date; label: string; isToday: boolean }[];
  totalDays: number;
  columnWidth: number;
  getBarPosition: (task: GanttTask) => { left: number; width: number } | null;
  getTodayPosition: () => number | null;
}

export function useGantt(tasks: GanttTask[]) {
  const [zoom, setZoom] = useState<ZoomLevel>("week");

  const config = useMemo((): GanttConfig => {
    const now = new Date();

    // Determine date range from tasks
    let minDate = now;
    let maxDate = addDays(now, 30);

    tasks.forEach(t => {
      const created = new Date(t.createdAt);
      if (created < minDate) minDate = created;
      if (t.dueDate) {
        const due = new Date(t.dueDate);
        if (due > maxDate) maxDate = due;
        if (due < minDate) minDate = due;
      }
    });

    // Add padding
    const startDate = zoom === "month" ? startOfMonth(addDays(minDate, -7)) : startOfWeek(addDays(minDate, -7));
    const endDate = zoom === "month" ? endOfMonth(addDays(maxDate, 14)) : endOfWeek(addDays(maxDate, 14));
    const totalDays = differenceInDays(endDate, startDate) + 1;

    // Column configuration
    let columns: { date: Date; label: string; isToday: boolean }[] = [];
    let columnWidth = 40; // pixels per unit

    if (zoom === "day") {
      columnWidth = 40;
      columns = eachDayOfInterval({ start: startDate, end: endDate }).map(d => ({
        date: d,
        label: format(d, "dd"),
        isToday: isToday(d),
      }));
    } else if (zoom === "week") {
      columnWidth = 120;
      columns = eachWeekOfInterval({ start: startDate, end: endDate }).map(d => ({
        date: d,
        label: format(d, "dd MMM"),
        isToday: false,
      }));
    } else {
      columnWidth = 160;
      columns = eachMonthOfInterval({ start: startDate, end: endDate }).map(d => ({
        date: d,
        label: format(d, "MMM yyyy"),
        isToday: false,
      }));
    }

    const pixelsPerDay = zoom === "day" ? columnWidth : zoom === "week" ? columnWidth / 7 : columnWidth / 30;

    const getBarPosition = (task: GanttTask) => {
      const taskStart = new Date(task.createdAt);
      const taskEnd = task.dueDate ? new Date(task.dueDate) : addDays(taskStart, 3);

      const startOffset = differenceInDays(taskStart, startDate);
      const duration = Math.max(differenceInDays(taskEnd, taskStart), 1);

      const left = startOffset * pixelsPerDay;
      const width = duration * pixelsPerDay;

      if (left + width < 0 || left > totalDays * pixelsPerDay) return null;

      return { left: Math.max(left, 0), width: Math.min(width, totalDays * pixelsPerDay - left) };
    };

    const getTodayPosition = () => {
      const offset = differenceInDays(now, startDate);
      return offset * pixelsPerDay;
    };

    return { startDate, endDate, columns, totalDays, columnWidth, getBarPosition, getTodayPosition };
  }, [tasks, zoom]);

  return { zoom, setZoom, config };
}
