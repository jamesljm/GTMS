import { addDays, addWeeks, addMonths, addYears, getDay, setDay, startOfDay, isAfter } from 'date-fns';
import { prisma } from '../prisma';
import { createNotification } from '../routes/notifications';

const DAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

const ORDINAL_MAP: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, last: -1,
};

/**
 * Calculate the next recurrence date for a task.
 * Returns null if recurrence should stop (end date passed or count exhausted).
 */
export function calculateNextRecurrenceDate(task: {
  recurrenceType: string | null;
  recurrenceInterval: number | null;
  recurrenceDays: string | null;
  recurrenceStartDate: Date | null;
  recurrenceEndDate: Date | null;
  recurrenceCount: number | null;
  recurrenceOccurrences: number;
  nextRecurrenceDate: Date | null;
  dueDate: Date | null;
}): Date | null {
  if (!task.recurrenceType) return null;

  // Check count limit
  if (task.recurrenceCount && task.recurrenceOccurrences >= task.recurrenceCount) return null;

  const interval = task.recurrenceInterval || 1;
  const baseDate = task.nextRecurrenceDate || task.recurrenceStartDate || task.dueDate || new Date();
  let next: Date;

  switch (task.recurrenceType) {
    case 'daily':
      next = addDays(baseDate, interval);
      break;

    case 'weekly':
    case 'biweekly': {
      const multiplier = task.recurrenceType === 'biweekly' ? 2 : 1;
      if (task.recurrenceDays) {
        try {
          const days: string[] = JSON.parse(task.recurrenceDays);
          const dayNumbers = days.map(d => DAY_MAP[d]).filter(d => d !== undefined).sort((a, b) => a - b);

          if (dayNumbers.length > 0) {
            const currentDay = getDay(baseDate);
            // Find next matching day in current week
            const nextInWeek = dayNumbers.find(d => d > currentDay);
            if (nextInWeek !== undefined) {
              next = setDay(baseDate, nextInWeek);
            } else {
              // Move to first day of next week(s)
              const weeksToAdd = interval * multiplier;
              const nextWeekStart = addWeeks(startOfDay(baseDate), weeksToAdd);
              next = setDay(nextWeekStart, dayNumbers[0], { weekStartsOn: 0 });
            }
          } else {
            next = addWeeks(baseDate, interval * multiplier);
          }
        } catch {
          next = addWeeks(baseDate, interval * multiplier);
        }
      } else {
        next = addWeeks(baseDate, interval * multiplier);
      }
      break;
    }

    case 'monthly': {
      if (task.recurrenceDays) {
        const days = task.recurrenceDays;
        // Check if it's an ordinal pattern like "first_Monday"
        const ordinalMatch = days.match(/^(first|second|third|fourth|last)_(\w+)$/);
        if (ordinalMatch) {
          const ordinal = ORDINAL_MAP[ordinalMatch[1]];
          const dayName = ordinalMatch[2];
          const dayNum = DAY_MAP[dayName];

          if (dayNum !== undefined) {
            next = addMonths(baseDate, interval);
            next = getNthWeekdayOfMonth(next, dayNum, ordinal);
          } else {
            next = addMonths(baseDate, interval);
          }
        } else {
          // It's a day-of-month number
          const dayOfMonth = parseInt(days, 10);
          if (!isNaN(dayOfMonth)) {
            next = addMonths(baseDate, interval);
            const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
            next = new Date(next.getFullYear(), next.getMonth(), Math.min(dayOfMonth, maxDay));
          } else {
            next = addMonths(baseDate, interval);
          }
        }
      } else {
        next = addMonths(baseDate, interval);
      }
      break;
    }

    case 'quarterly':
      next = addMonths(baseDate, 3 * interval);
      break;

    case 'yearly':
      next = addYears(baseDate, interval);
      break;

    default:
      return null;
  }

  // Check end date
  if (task.recurrenceEndDate && isAfter(next, task.recurrenceEndDate)) return null;

  return next;
}

/**
 * Get the nth weekday of a given month.
 */
function getNthWeekdayOfMonth(date: Date, weekday: number, nth: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth();

  if (nth === -1) {
    // Last occurrence
    const lastDay = new Date(year, month + 1, 0);
    let d = lastDay.getDate();
    while (new Date(year, month, d).getDay() !== weekday) d--;
    return new Date(year, month, d);
  }

  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const candidate = new Date(year, month, d);
    if (candidate.getMonth() !== month) break;
    if (candidate.getDay() === weekday) {
      count++;
      if (count === nth) return candidate;
    }
  }
  // Fallback: return end of month
  return new Date(year, month + 1, 0);
}

/**
 * Spawn recurring task instances. Called by BullMQ worker hourly.
 */
export async function spawnRecurringTasks() {
  const now = new Date();

  // Find template tasks (no parent) with due recurrence
  const templates = await prisma.task.findMany({
    where: {
      recurrenceType: { not: null },
      recurrenceParentId: null,
      nextRecurrenceDate: { lte: now },
      status: { notIn: ['Done', 'Cancelled'] },
    },
    include: {
      workstream: { select: { id: true } },
    },
  });

  for (const template of templates) {
    try {
      // Create new task instance
      await prisma.task.create({
        data: {
          title: template.title,
          description: template.description,
          type: 'Recurring',
          priority: template.priority,
          status: 'Not Started',
          source: 'Recurring',
          dueDate: template.nextRecurrenceDate,
          workstreamId: template.workstreamId,
          assigneeId: template.assigneeId,
          createdById: template.createdById,
          recurrenceParentId: template.id,
          acceptanceStatus: 'Accepted',
        },
      });

      // Compute next recurrence date
      const nextDate = calculateNextRecurrenceDate({
        ...template,
        recurrenceOccurrences: template.recurrenceOccurrences + 1,
      });

      // Update template
      await prisma.task.update({
        where: { id: template.id },
        data: {
          recurrenceOccurrences: { increment: 1 },
          nextRecurrenceDate: nextDate,
        },
      });

      // Notify assignee
      if (template.assigneeId) {
        await createNotification(
          template.assigneeId,
          'TASK_ASSIGNED',
          'Recurring task created',
          `New instance of recurring task: ${template.title}`,
          template.id,
        ).catch(err => console.error('Recurrence notification failed:', err.message));
      }
    } catch (err) {
      console.error(`Failed to spawn recurring task for template ${template.id}:`, err);
    }
  }

  console.log(`Processed ${templates.length} recurring task templates`);
}
