import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';
import { prisma } from '../prisma';
import { sendDailyDigest, sendWeeklyDigest, sendTaskReminder } from './email';

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
    connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return connection;
}

// Daily digest queue
const DAILY_DIGEST_QUEUE = 'daily-digest';
const WEEKLY_DIGEST_QUEUE = 'weekly-digest';
const TASK_REMINDER_QUEUE = 'task-reminder';

export function startWorkers() {
  const conn = getConnection();

  // Daily digest worker
  new Worker(DAILY_DIGEST_QUEUE, async (job) => {
    console.log('Running daily digest...');
    // Send to ED (primary user)
    const ed = await prisma.user.findFirst({ where: { role: 'ED', isActive: true } });
    if (ed) {
      await sendDailyDigest(ed.id);
    }
  }, { connection: conn });

  // Weekly digest worker
  new Worker(WEEKLY_DIGEST_QUEUE, async (job) => {
    console.log('Running weekly digest...');
    const ed = await prisma.user.findFirst({ where: { role: 'ED', isActive: true } });
    if (ed) {
      await sendWeeklyDigest(ed.id);
    }
  }, { connection: conn });

  // Task reminder worker
  new Worker(TASK_REMINDER_QUEUE, async (job) => {
    console.log('Running task reminders...');
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Find tasks due in 3 days or less that are not done
    const tasks = await prisma.task.findMany({
      where: {
        dueDate: { lte: threeDaysFromNow },
        status: { notIn: ['Done', 'Cancelled'] },
        assigneeId: { not: null },
      },
    });

    for (const task of tasks) {
      if (task.assigneeId) {
        // Check if we already sent a reminder in the last 24h
        const recentReminder = await prisma.reminderLog.findFirst({
          where: {
            taskId: task.id,
            recipientId: task.assigneeId,
            type: 'task_reminder',
            sentAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        });
        if (!recentReminder) {
          await sendTaskReminder(task.id, task.assigneeId);
        }
      }
    }
  }, { connection: conn });

  console.log('BullMQ workers started');
}

export async function setupRecurringJobs() {
  const conn = getConnection();

  const dailyQueue = new Queue(DAILY_DIGEST_QUEUE, { connection: conn });
  const weeklyQueue = new Queue(WEEKLY_DIGEST_QUEUE, { connection: conn });
  const reminderQueue = new Queue(TASK_REMINDER_QUEUE, { connection: conn });

  // Remove existing repeatable jobs
  const existingDaily = await dailyQueue.getRepeatableJobs();
  for (const job of existingDaily) {
    await dailyQueue.removeRepeatableByKey(job.key);
  }
  const existingWeekly = await weeklyQueue.getRepeatableJobs();
  for (const job of existingWeekly) {
    await weeklyQueue.removeRepeatableByKey(job.key);
  }
  const existingReminder = await reminderQueue.getRepeatableJobs();
  for (const job of existingReminder) {
    await reminderQueue.removeRepeatableByKey(job.key);
  }

  // Daily digest at 07:30 MYT (23:30 UTC previous day)
  await dailyQueue.add('daily-digest', {}, {
    repeat: { pattern: '30 23 * * *' }, // 07:30 MYT = 23:30 UTC
  });

  // Weekly digest on Monday at 07:00 MYT (23:00 UTC Sunday)
  await weeklyQueue.add('weekly-digest', {}, {
    repeat: { pattern: '0 23 * * 0' }, // 07:00 MYT Monday = 23:00 UTC Sunday
  });

  // Task reminders at 08:00 MYT daily (00:00 UTC)
  await reminderQueue.add('task-reminder', {}, {
    repeat: { pattern: '0 0 * * *' }, // 08:00 MYT = 00:00 UTC
  });

  console.log('Recurring jobs set up');
}
