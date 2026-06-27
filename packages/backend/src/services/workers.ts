import cron from 'node-cron';
import { prisma } from '../prisma';
import { sendDailyDigest, sendWeeklyDigest, sendTaskReminder } from './email';
import { shouldSendEmail } from './preference-check';

let schedulerRunning = false;

export function getSchedulerStatus(): string {
  return schedulerRunning ? 'active' : 'inactive';
}

export function startScheduledJobs() {
  // Daily digest at 07:30 MYT (23:30 UTC previous day)
  cron.schedule('30 23 * * *', async () => {
    try {
      console.log('Running daily digest...');
      const ed = await prisma.user.findFirst({ where: { role: 'ED', isActive: true } });
      if (ed) {
        const allowed = await shouldSendEmail(ed.id, 'digest');
        if (allowed) {
          await sendDailyDigest(ed.id);
        }
      }
    } catch (err) {
      console.error('Daily digest failed:', err);
    }
  });

  // Weekly digest on Monday at 07:00 MYT (23:00 UTC Sunday)
  cron.schedule('0 23 * * 0', async () => {
    try {
      console.log('Running weekly digest...');
      const ed = await prisma.user.findFirst({ where: { role: 'ED', isActive: true } });
      if (ed) {
        const allowed = await shouldSendEmail(ed.id, 'digest');
        if (allowed) {
          await sendWeeklyDigest(ed.id);
        }
      }
    } catch (err) {
      console.error('Weekly digest failed:', err);
    }
  });

  // Task reminders at 08:00 MYT daily (00:00 UTC)
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('Running task reminders...');
      const now = new Date();
      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const tasks = await prisma.task.findMany({
        where: {
          dueDate: { lte: threeDaysFromNow },
          status: { notIn: ['Done', 'Cancelled'] },
          assigneeId: { not: null },
        },
      });

      for (const task of tasks) {
        if (task.assigneeId) {
          const recentReminder = await prisma.reminderLog.findFirst({
            where: {
              taskId: task.id,
              recipientId: task.assigneeId,
              type: 'task_reminder',
              sentAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
            },
          });
          if (!recentReminder) {
            const allowed = await shouldSendEmail(task.assigneeId, 'reminder');
            if (allowed) {
              await sendTaskReminder(task.id, task.assigneeId);
            }
          }
        }
      }
    } catch (err) {
      console.error('Task reminders failed:', err);
    }
  });

  // Recurring tasks - hourly
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('Running recurring task spawner...');
      const { spawnRecurringTasks } = await import('./recurrence');
      await spawnRecurringTasks();
    } catch (err) {
      console.error('Recurring tasks failed:', err);
    }
  });

  // Overdue/blocker alerts at 09:00 MYT daily (01:00 UTC)
  cron.schedule('0 1 * * *', async () => {
    try {
      console.log('Running overdue/blocker alerts...');
      const { processOverdueBlockerAlerts } = await import('./escalation');
      await processOverdueBlockerAlerts();
    } catch (err) {
      console.error('Overdue/blocker alerts failed:', err);
    }
  });

  // Email follow-ups - every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      console.log('Running email follow-ups...');
      const { processEmailFollowUps } = await import('./email-followup-worker');
      await processEmailFollowUps();
    } catch (err) {
      console.error('Email follow-ups failed:', err);
    }
  });

  schedulerRunning = true;
  console.log('Scheduled jobs started (node-cron)');
}
