/**
 * Format a human-readable description of a task's recurrence pattern.
 */
export function formatRecurrenceDescription(task: {
  recurrenceType?: string | null;
  recurrenceInterval?: number | null;
  recurrenceDays?: string | null;
  recurrenceEndDate?: string | null;
  recurrenceCount?: number | null;
}): string {
  if (!task.recurrenceType) return '';

  const interval = task.recurrenceInterval || 1;
  let desc = '';

  switch (task.recurrenceType) {
    case 'daily':
      desc = interval === 1 ? 'Every day' : `Every ${interval} days`;
      break;

    case 'weekly': {
      const prefix = interval === 1 ? 'Every week' : `Every ${interval} weeks`;
      if (task.recurrenceDays) {
        try {
          const days: string[] = JSON.parse(task.recurrenceDays);
          if (days.length > 0) {
            desc = `${interval === 1 ? 'Every' : `Every ${interval} weeks on`} ${days.join(', ')}`;
          } else {
            desc = prefix;
          }
        } catch {
          desc = prefix;
        }
      } else {
        desc = prefix;
      }
      break;
    }

    case 'biweekly': {
      if (task.recurrenceDays) {
        try {
          const days: string[] = JSON.parse(task.recurrenceDays);
          desc = days.length > 0 ? `Every 2 weeks on ${days.join(', ')}` : 'Every 2 weeks';
        } catch {
          desc = 'Every 2 weeks';
        }
      } else {
        desc = 'Every 2 weeks';
      }
      break;
    }

    case 'monthly': {
      const prefix = interval === 1 ? 'Monthly' : `Every ${interval} months`;
      if (task.recurrenceDays) {
        const ordinalMatch = task.recurrenceDays.match(/^(first|second|third|fourth|last)_(\w+)$/);
        if (ordinalMatch) {
          desc = `${prefix} on the ${ordinalMatch[1]} ${ordinalMatch[2]}`;
        } else {
          const dayNum = parseInt(task.recurrenceDays, 10);
          if (!isNaN(dayNum)) {
            const suffix = getOrdinalSuffix(dayNum);
            desc = `${prefix} on the ${dayNum}${suffix}`;
          } else {
            desc = prefix;
          }
        }
      } else {
        desc = prefix;
      }
      break;
    }

    case 'quarterly':
      desc = interval === 1 ? 'Every quarter' : `Every ${interval} quarters`;
      break;

    case 'yearly':
      desc = interval === 1 ? 'Every year' : `Every ${interval} years`;
      break;

    default:
      return '';
  }

  // Add end condition
  if (task.recurrenceEndDate) {
    const endDate = new Date(task.recurrenceEndDate);
    desc += `, until ${endDate.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  } else if (task.recurrenceCount) {
    desc += `, ${task.recurrenceCount} times`;
  }

  return desc;
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
