import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';
import { prisma } from '../prisma';
import { sendDailyDigest, sendWeeklyDigest, sendTaskReminder } from './email';
import { shouldSendEmail } from './preference-check';

let connection: IORedis | null = null;

function isRedisConfigured(): boolean {
  const url = config.REDIS_URL;
  return !!(url && url !== 'redis://localhost:6379' && url.startsWith('redis'));
}

function getConnection() {
  if (!connection) {
    if (!isRedisConfigured()) {
      throw new Error('Redis not configured');
    }
    connection = new IORedis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      ...(config.REDIS_URL.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {}),
    });
  }
  return connection;
}

export function getRedisStatus(): string {
  if (!isRedisConfigured()) return 'not_configured';
  if (!connection) return 'not_connected';
  return connection.status;
}

// Queue names
const DAILY_DIGEST_QUEUE = 'daily-digest';
const WEEKLY_DIGEST_QUEUE = 'weekly-digest';
const TASK_REMINDER_QUEUE = 'task-reminder';
const RECURRING_TASKS_QUEUE = 'recurring-tasks';
const OVERDUE_BLOCKER_QUEUE = 'overdue-blocker-alerts';
const EMAIL_FOLLOWUP_QUEUE = 'email-followup';

export function startWorkers() {
  const conn = getConnection();

  // Daily digest worker
  new Worker(DAILY_DIGEST_QUEUE, async (job) => {
    console.log('Running daily digest...');
    const ed = await prisma.user.findFirst({ where: { role: 'ED', isActive: true } });
    if (ed) {
      const allowed = await shouldSendEmail(ed.id, 'digest');
      if (allowed) {
        await sendDailyDigest(ed.id);
      }
    }
  }, { connection: conn });

  // Weekly digest worker
  new Worker(WEEKLY_DIGEST_QUEUE, async (job) => {
    console.log('Running weekly digest...');
    const ed = await prisma.user.findFirst({ where: { role: 'ED', isActive: true } });
    if (ed) {
      const allowed = await shouldSendEmail(ed.id, 'digest');
      if (allowed) {
        await sendWeeklyDigest(ed.id);
      }
    }
  }, { connection: conn });

  // Task reminder worker
  new Worker(TASK_REMINDER_QUEUE, async (job) => {
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
  }, { connection: conn });

  // Recurring tasks worker
  new Worker(RECURRING_TASKS_QUEUE, async (job) => {
    console.log('Running recurring task spawner...');
    const { spawnRecurringTasks } = await import('./recurrence');
    await spawnRecurringTasks();
  }, { connection: conn });

  // Overdue/blocker alerts worker
  new Worker(OVERDUE_BLOCKER_QUEUE, async (job) => {
    console.log('Running overdue/blocker alerts...');
    const { processOverdueBlockerAlerts } = await import('./escalation');
    await processOverdueBlockerAlerts();
  }, { connection: conn });

  // Email follow-up worker
  new Worker(EMAIL_FOLLOWUP_QUEUE, async () => {
    console.log('Running email follow-ups...');
    const { processEmailFollowUps } = await import('./email-followup-worker');
    await processEmailFollowUps();
  }, { connection: conn });

  console.log('BullMQ workers started');
}

export async function setupRecurringJobs() {
  const conn = getConnection();

  const dailyQueue = new Queue(DAILY_DIGEST_QUEUE, { connection: conn });
  const weeklyQueue = new Queue(WEEKLY_DIGEST_QUEUE, { connection: conn });
  const reminderQueue = new Queue(TASK_REMINDER_QUEUE, { connection: conn });
  const recurringQueue = new Queue(RECURRING_TASKS_QUEUE, { connection: conn });
  const overdueQueue = new Queue(OVERDUE_BLOCKER_QUEUE, { connection: conn });
  const emailFollowUpQueue = new Queue(EMAIL_FOLLOWUP_QUEUE, { connection: conn });

  // Remove existing repeatable jobs
  for (const queue of [dailyQueue, weeklyQueue, reminderQueue, recurringQueue, overdueQueue, emailFollowUpQueue]) {
    const existing = await queue.getRepeatableJobs();
    for (const job of existing) {
      await queue.removeRepeatableByKey(job.key);
    }
  }

  // Daily digest at 07:30 MYT (23:30 UTC previous day)
  await dailyQueue.add('daily-digest', {}, {
    repeat: { pattern: '30 23 * * *' },
  });

  // Weekly digest on Monday at 07:00 MYT (23:00 UTC Sunday)
  await weeklyQueue.add('weekly-digest', {}, {
    repeat: { pattern: '0 23 * * 0' },
  });

  // Task reminders at 08:00 MYT daily (00:00 UTC)
  await reminderQueue.add('task-reminder', {}, {
    repeat: { pattern: '0 0 * * *' },
  });

  // Recurring tasks - hourly
  await recurringQueue.add('recurring-tasks', {}, {
    repeat: { pattern: '0 * * * *' },
  });

  // Overdue/blocker alerts at 09:00 MYT daily (01:00 UTC)
  await overdueQueue.add('overdue-blocker-alerts', {}, {
    repeat: { pattern: '0 1 * * *' },
  });

  // Email follow-ups - every 15 minutes
  await emailFollowUpQueue.add('email-followup', {}, {
    repeat: { pattern: '*/15 * * * *' },
  });

  console.log('Recurring jobs set up');
}
