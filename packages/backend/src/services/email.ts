import { Resend } from 'resend';
import { config } from '../config';
import { prisma } from '../prisma';

const resend = config.RESEND_API_KEY ? new Resend(config.RESEND_API_KEY) : null;

export async function sendTaskReminder(taskId: string, recipientId: string) {
  if (!resend) return;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { workstream: true, assignee: true },
  });
  if (!task || !task.assignee) return;

  const dueStr = task.dueDate ? task.dueDate.toLocaleDateString('en-MY') : 'No due date';
  const subject = `[GTMS-${task.id}] Reminder: ${task.title}`;

  const html = `
    <h3>Task Reminder</h3>
    <p><strong>${task.title}</strong></p>
    <p>Workstream: ${task.workstream?.name || 'N/A'}</p>
    <p>Priority: ${task.priority}</p>
    <p>Due: ${dueStr}</p>
    <p>Status: ${task.status}</p>
    ${task.description ? `<p>${task.description}</p>` : ''}
    <hr>
    <p><em>Reply to this email with DONE, IN PROGRESS, or BLOCKED to update the task status.</em></p>
  `;

  try {
    const result = await resend.emails.send({
      from: config.RESEND_FROM_EMAIL,
      to: task.assignee.email,
      subject,
      html,
    });

    await prisma.reminderLog.create({
      data: {
        type: 'task_reminder',
        recipientId,
        taskId,
        emailId: result.data?.id,
      },
    });
  } catch (err) {
    console.error('Failed to send reminder:', err);
  }
}

export async function sendDailyDigest(userId: string) {
  if (!resend) return;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [overdue, dueToday, critical, waitingOn] = await Promise.all([
    prisma.task.findMany({ where: { assigneeId: userId, dueDate: { lt: now }, status: { notIn: ['Done', 'Cancelled'] } }, include: { workstream: true }, orderBy: { dueDate: 'asc' }, take: 20 }),
    prisma.task.findMany({ where: { assigneeId: userId, dueDate: { gte: now, lte: endOfDay }, status: { notIn: ['Done', 'Cancelled'] } }, include: { workstream: true } }),
    prisma.task.findMany({ where: { assigneeId: userId, priority: 'Critical', status: { notIn: ['Done', 'Cancelled'] } }, include: { workstream: true } }),
    prisma.task.findMany({ where: { assigneeId: userId, OR: [{ type: 'Waiting On' }, { status: 'Waiting On' }], status: { notIn: ['Done', 'Cancelled'] } }, include: { workstream: true } }),
  ]);

  const formatTasks = (tasks: any[]) => tasks.map(t =>
    `<li><strong>[${t.workstream?.code || '—'}]</strong> ${t.title} (Due: ${t.dueDate?.toLocaleDateString('en-MY') || 'N/A'})</li>`
  ).join('');

  const html = `
    <h2>GTMS Daily Digest - ${now.toLocaleDateString('en-MY')}</h2>
    <h3>Overdue (${overdue.length})</h3>
    <ul>${formatTasks(overdue) || '<li>None</li>'}</ul>
    <h3>Due Today (${dueToday.length})</h3>
    <ul>${formatTasks(dueToday) || '<li>None</li>'}</ul>
    <h3>Critical Tasks (${critical.length})</h3>
    <ul>${formatTasks(critical) || '<li>None</li>'}</ul>
    <h3>Waiting On (${waitingOn.length})</h3>
    <ul>${formatTasks(waitingOn) || '<li>None</li>'}</ul>
  `;

  try {
    const result = await resend.emails.send({
      from: config.RESEND_FROM_EMAIL,
      to: user.email,
      subject: `GTMS Daily Digest - ${now.toLocaleDateString('en-MY')}`,
      html,
    });

    await prisma.reminderLog.create({
      data: { type: 'daily_digest', recipientId: userId, emailId: result.data?.id },
    });
  } catch (err) {
    console.error('Failed to send daily digest:', err);
  }
}

export async function sendWeeklyDigest(userId: string) {
  if (!resend) return;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [completedThisWeek, totalActive, overdue] = await Promise.all([
    prisma.task.count({ where: { assigneeId: userId, status: 'Done', completedAt: { gte: weekAgo } } }),
    prisma.task.count({ where: { assigneeId: userId, status: { notIn: ['Done', 'Cancelled'] } } }),
    prisma.task.count({ where: { assigneeId: userId, dueDate: { lt: now }, status: { notIn: ['Done', 'Cancelled'] } } }),
  ]);

  const html = `
    <h2>GTMS Weekly Summary</h2>
    <p>Week ending: ${now.toLocaleDateString('en-MY')}</p>
    <ul>
      <li>Tasks completed this week: <strong>${completedThisWeek}</strong></li>
      <li>Active tasks remaining: <strong>${totalActive}</strong></li>
      <li>Overdue tasks: <strong>${overdue}</strong></li>
    </ul>
  `;

  try {
    const result = await resend.emails.send({
      from: config.RESEND_FROM_EMAIL,
      to: user.email,
      subject: `GTMS Weekly Summary - ${now.toLocaleDateString('en-MY')}`,
      html,
    });

    await prisma.reminderLog.create({
      data: { type: 'weekly_digest', recipientId: userId, emailId: result.data?.id },
    });
  } catch (err) {
    console.error('Failed to send weekly digest:', err);
  }
}
