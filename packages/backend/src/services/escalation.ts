import { prisma } from '../prisma';
import { sendOverdueAlert, sendBlockerAlert } from './email';
import { shouldSendEmail } from './preference-check';

/**
 * Get HOD user for a task's workstream.
 */
export async function getHODForTask(task: { workstreamId: string | null }): Promise<string | null> {
  if (!task.workstreamId) return null;

  const hodMember = await prisma.workstreamMember.findFirst({
    where: { workstreamId: task.workstreamId, role: 'HOD' },
    select: { userId: true },
  });
  if (hodMember) return hodMember.userId;

  // Fallback: department head
  const workstream = await prisma.workstream.findUnique({
    where: { id: task.workstreamId },
    include: { department: { select: { headId: true } } },
  });
  return workstream?.department?.headId || null;
}

/**
 * Get the ED user.
 */
export async function getEDUser(): Promise<string | null> {
  const ed = await prisma.user.findFirst({
    where: { role: 'ED', isActive: true },
    select: { id: true },
  });
  return ed?.id || null;
}

/**
 * Calculate days overdue.
 */
export function daysOverdue(dueDate: Date): number {
  return Math.floor((Date.now() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Check if a reminder was already sent within dedup window.
 */
async function wasRecentlySent(taskId: string, recipientId: string, type: string, hoursAgo: number = 24): Promise<boolean> {
  const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  const existing = await prisma.reminderLog.findFirst({
    where: { taskId, recipientId, type, sentAt: { gte: since } },
  });
  return !!existing;
}

/**
 * Process all overdue and blocker alerts. Called by BullMQ worker daily.
 */
export async function processOverdueBlockerAlerts() {
  const now = new Date();

  // --- OVERDUE CASCADE ---
  const overdueTasks = await prisma.task.findMany({
    where: {
      dueDate: { lt: now },
      status: { notIn: ['Done', 'Cancelled'] },
      assigneeId: { not: null },
    },
    select: {
      id: true,
      assigneeId: true,
      workstreamId: true,
      dueDate: true,
    },
  });

  for (const task of overdueTasks) {
    if (!task.assigneeId || !task.dueDate) continue;

    const overdueDays = daysOverdue(task.dueDate);

    // Day 1+: email assignee
    if (overdueDays >= 1) {
      const sent = await wasRecentlySent(task.id, task.assigneeId, 'overdue_alert');
      if (!sent) {
        const allowed = await shouldSendEmail(task.assigneeId, 'overdue');
        if (allowed) {
          await sendOverdueAlert(task.id, task.assigneeId, 'assignee').catch(err =>
            console.error(`Overdue alert failed for task ${task.id}:`, err.message)
          );
        }
      }
    }

    // Day 3+: email HOD
    if (overdueDays >= 3) {
      const hodId = await getHODForTask(task);
      if (hodId) {
        const sent = await wasRecentlySent(task.id, hodId, 'overdue_alert');
        if (!sent) {
          const allowed = await shouldSendEmail(hodId, 'overdue');
          if (allowed) {
            await sendOverdueAlert(task.id, hodId, 'hod').catch(err =>
              console.error(`HOD overdue alert failed for task ${task.id}:`, err.message)
            );
          }
        }
      }
    }

    // Day 5+: email ED
    if (overdueDays >= 5) {
      const edId = await getEDUser();
      if (edId) {
        const sent = await wasRecentlySent(task.id, edId, 'overdue_alert');
        if (!sent) {
          const allowed = await shouldSendEmail(edId, 'overdue');
          if (allowed) {
            await sendOverdueAlert(task.id, edId, 'ed').catch(err =>
              console.error(`ED overdue alert failed for task ${task.id}:`, err.message)
            );
          }
        }
      }
    }
  }

  // --- BLOCKER CASCADE ---
  const blockedTasks = await prisma.task.findMany({
    where: {
      status: 'Blocked',
      assigneeId: { not: null },
    },
    select: {
      id: true,
      assigneeId: true,
      workstreamId: true,
      updatedAt: true,
    },
  });

  for (const task of blockedTasks) {
    if (!task.assigneeId) continue;

    const daysBlocked = Math.floor((Date.now() - task.updatedAt.getTime()) / (24 * 60 * 60 * 1000));

    // Assignee + HOD: once per blocker occurrence
    const assigneeSent = await wasRecentlySent(task.id, task.assigneeId, 'blocker_escalation');
    if (!assigneeSent) {
      const allowed = await shouldSendEmail(task.assigneeId, 'blocker');
      if (allowed) {
        await sendBlockerAlert(task.id, task.assigneeId, 'assignee').catch(err =>
          console.error(`Blocker alert failed for task ${task.id}:`, err.message)
        );
      }
    }

    const hodId = await getHODForTask(task);
    if (hodId) {
      const hodSent = await wasRecentlySent(task.id, hodId, 'blocker_escalation');
      if (!hodSent) {
        const allowed = await shouldSendEmail(hodId, 'blocker');
        if (allowed) {
          await sendBlockerAlert(task.id, hodId, 'hod').catch(err =>
            console.error(`HOD blocker alert failed for task ${task.id}:`, err.message)
          );
        }
      }
    }

    // 3+ days blocked: email ED
    if (daysBlocked >= 3) {
      const edId = await getEDUser();
      if (edId) {
        const edSent = await wasRecentlySent(task.id, edId, 'blocker_escalation');
        if (!edSent) {
          const allowed = await shouldSendEmail(edId, 'blocker');
          if (allowed) {
            await sendBlockerAlert(task.id, edId, 'ed').catch(err =>
              console.error(`ED blocker alert failed for task ${task.id}:`, err.message)
            );
          }
        }
      }
    }
  }

  console.log(`Processed ${overdueTasks.length} overdue tasks and ${blockedTasks.length} blocked tasks`);
}
