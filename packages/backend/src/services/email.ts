import { config } from '../config';
import { prisma } from '../prisma';
import { createNotification } from '../routes/notifications';
import { sendMail } from './microsoft-graph';

const isEmailEnabled = () => !!(config.M365_SENDER_EMAIL && config.MS_CLIENT_ID && config.MS_TENANT_ID && config.MS_CLIENT_SECRET);

async function send(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  try {
    return await sendMail(to, subject, html);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendTaskReminder(taskId: string, recipientId: string) {
  if (!isEmailEnabled()) return;

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

  const result = await send(task.assignee.email, subject, html);
  if (!result.success) {
    console.error('Failed to send reminder:', result.error);
    return;
  }

  await prisma.reminderLog.create({
    data: {
      type: 'task_reminder',
      recipientId,
      taskId,
    },
  });
}

export async function sendDailyDigest(userId: string) {
  if (!isEmailEnabled()) return;

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

  const result = await send(user.email, `GTMS Daily Digest - ${now.toLocaleDateString('en-MY')}`, html);
  if (!result.success) {
    console.error('Failed to send daily digest:', result.error);
    return;
  }

  await prisma.reminderLog.create({
    data: { type: 'daily_digest', recipientId: userId },
  });
}

export async function sendWeeklyDigest(userId: string) {
  if (!isEmailEnabled()) return;

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

  const result = await send(user.email, `GTMS Weekly Summary - ${now.toLocaleDateString('en-MY')}`, html);
  if (!result.success) {
    console.error('Failed to send weekly digest:', result.error);
    return;
  }

  await prisma.reminderLog.create({
    data: { type: 'weekly_digest', recipientId: userId },
  });
}

export async function sendOverdueAlert(taskId: string, recipientId: string, escalationLevel: string) {
  if (!isEmailEnabled()) return;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { workstream: true, assignee: { select: { name: true, email: true } } },
  });
  if (!task) return;

  const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
  if (!recipient) return;

  const overdueDays = Math.floor((Date.now() - (task.dueDate?.getTime() || 0)) / (24 * 60 * 60 * 1000));
  const levelLabel = escalationLevel === 'ed' ? 'ED Escalation' : escalationLevel === 'hod' ? 'HOD Alert' : 'Overdue';

  const subject = `[GTMS] ${levelLabel}: ${task.title} (${overdueDays} days overdue)`;
  const html = `
    <h3>Overdue Task Alert - ${levelLabel}</h3>
    <p><strong>${task.title}</strong></p>
    <p>Workstream: ${task.workstream?.name || 'N/A'}</p>
    <p>Assignee: ${task.assignee?.name || 'Unassigned'}</p>
    <p>Priority: ${task.priority}</p>
    <p>Due: ${task.dueDate?.toLocaleDateString('en-MY') || 'N/A'}</p>
    <p style="color: #dc2626; font-weight: bold;">${overdueDays} day(s) overdue</p>
    ${task.description ? `<p>${task.description}</p>` : ''}
    <hr>
    <p><em>This is an automated escalation alert from GTMS.</em></p>
  `;

  const result = await send(recipient.email, subject, html);
  if (!result.success) {
    console.error('Failed to send overdue alert:', result.error);
    return;
  }

  await prisma.reminderLog.create({
    data: { type: 'overdue_alert', recipientId, taskId },
  });

  await createNotification(
    recipientId,
    'TASK_OVERDUE',
    `Task overdue (${overdueDays}d)`,
    `${task.title} is ${overdueDays} day(s) overdue`,
    taskId,
  ).catch(() => {});
}

export async function sendStatusChangeAlert(
  taskId: string,
  recipientId: string,
  status: 'Blocked' | 'Waiting On',
  remarks: string,
  changedByName: string,
) {
  if (!isEmailEnabled()) return;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { workstream: true, assignee: { select: { name: true, email: true } } },
  });
  if (!task) return;

  const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
  if (!recipient) return;

  const statusLabel = status === 'Blocked' ? 'BLOCKED' : 'WAITING ON';
  const statusColor = status === 'Blocked' ? '#dc2626' : '#d97706';

  const subject = `[GTMS] Task ${statusLabel}: ${task.title}`;
  const html = `
    <h3>Task Status Changed - ${statusLabel}</h3>
    <p><strong>${task.title}</strong></p>
    <p>Workstream: ${task.workstream?.name || 'N/A'}</p>
    <p>Assignee: ${task.assignee?.name || 'Unassigned'}</p>
    <p>Priority: ${task.priority}</p>
    <p style="color: ${statusColor}; font-weight: bold;">Status: ${statusLabel}</p>
    <p>Changed by: ${changedByName}</p>
    ${remarks ? `<div style="margin: 12px 0; padding: 12px; background: #f9fafb; border-left: 4px solid ${statusColor}; border-radius: 4px;"><strong>Remarks:</strong><br/>${remarks}</div>` : ''}
    <hr>
    <p><em>This is an automated status change alert from GTMS.</em></p>
  `;

  const result = await send(recipient.email, subject, html);
  if (!result.success) {
    console.error('Failed to send status change alert:', result.error);
    return;
  }

  await prisma.reminderLog.create({
    data: { type: 'status_alert', recipientId, taskId },
  });
}

export async function sendBlockerAlert(taskId: string, recipientId: string, escalationLevel: string) {
  if (!isEmailEnabled()) return;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { workstream: true, assignee: { select: { name: true, email: true } } },
  });
  if (!task) return;

  const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
  if (!recipient) return;

  const levelLabel = escalationLevel === 'ed' ? 'ED Escalation' : escalationLevel === 'hod' ? 'HOD Alert' : 'Blocker';

  const subject = `[GTMS] ${levelLabel}: ${task.title} is BLOCKED`;
  const html = `
    <h3>Blocked Task Alert - ${levelLabel}</h3>
    <p><strong>${task.title}</strong></p>
    <p>Workstream: ${task.workstream?.name || 'N/A'}</p>
    <p>Assignee: ${task.assignee?.name || 'Unassigned'}</p>
    <p>Priority: ${task.priority}</p>
    <p style="color: #dc2626; font-weight: bold;">Status: BLOCKED</p>
    ${task.description ? `<p>${task.description}</p>` : ''}
    <hr>
    <p><em>This is an automated blocker escalation from GTMS.</em></p>
  `;

  const result = await send(recipient.email, subject, html);
  if (!result.success) {
    console.error('Failed to send blocker alert:', result.error);
    return;
  }

  await prisma.reminderLog.create({
    data: { type: 'blocker_escalation', recipientId, taskId },
  });

  await createNotification(
    recipientId,
    'TASK_BLOCKED',
    'Task blocked',
    `${task.title} is blocked and requires attention`,
    taskId,
  ).catch(() => {});
}
