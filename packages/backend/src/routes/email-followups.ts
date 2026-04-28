import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AppError } from '../middleware/error';
import { canEditTask } from '../middleware/rbac';
import { createEmailFollowUpSchema, updateEmailFollowUpSchema } from 'shared';
import { sendMailAsUser } from '../services/microsoft-graph';
import { calculateNextRecurrenceDate } from '../services/recurrence';

const router = Router({ mergeParams: true });

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

// Verify task exists and user has access
async function verifyTaskAccess(req: Request) {
  const { taskId } = req.params;
  const user = req.user!;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, assigneeId: true, createdById: true, workstreamId: true },
  });

  if (!task) throw new AppError(404, 'Task not found');

  const canEdit = user.role === 'SUPER_ADMIN' || user.role === 'ED' || await canEditTask(user, task);
  if (!canEdit) throw new AppError(403, 'You do not have access to this task');

  return task;
}

// GET / — List follow-ups for task
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  await verifyTaskAccess(req);
  const { taskId } = req.params;

  const followUps = await prisma.taskEmailFollowUp.findMany({
    where: { taskId },
    include: {
      sender: { select: { id: true, name: true, email: true, microsoftId: true } },
      sendLogs: {
        orderBy: { sentAt: 'desc' },
        take: 5,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(followUps);
}));

// POST / — Create follow-up
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  await verifyTaskAccess(req);
  const { taskId } = req.params;
  const user = req.user!;

  const parsed = createEmailFollowUpSchema.parse(req.body);

  // Verify sender has microsoftId
  const sender = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, microsoftId: true },
  });

  if (!sender?.microsoftId) {
    throw new AppError(400, 'Your account is not linked to Microsoft 365. Email follow-ups require an M365-linked account.');
  }

  // Compute nextSendDate
  let nextSendDate: Date | null = null;
  if (parsed.recurrenceType) {
    // Recurring: compute first send date
    const fakeTask = {
      recurrenceType: parsed.recurrenceType,
      recurrenceInterval: parsed.recurrenceInterval || 1,
      recurrenceDays: parsed.recurrenceDays || null,
      recurrenceStartDate: null,
      recurrenceEndDate: parsed.recurrenceEndDate ? new Date(parsed.recurrenceEndDate) : null,
      recurrenceCount: parsed.recurrenceCount || null,
      recurrenceOccurrences: 0,
      nextRecurrenceDate: null,
      dueDate: parsed.sendAt ? new Date(parsed.sendAt) : new Date(),
    };
    nextSendDate = calculateNextRecurrenceDate(fakeTask);
  } else if (parsed.sendAt) {
    nextSendDate = new Date(parsed.sendAt);
  }

  const followUp = await prisma.taskEmailFollowUp.create({
    data: {
      taskId,
      senderId: user.id,
      recipientEmails: JSON.stringify(parsed.recipientEmails),
      subject: parsed.subject,
      body: parsed.body,
      sendAt: parsed.sendAt ? new Date(parsed.sendAt) : null,
      recurrenceType: parsed.recurrenceType || null,
      recurrenceInterval: parsed.recurrenceInterval || null,
      recurrenceDays: parsed.recurrenceDays || null,
      nextSendDate,
      recurrenceEndDate: parsed.recurrenceEndDate ? new Date(parsed.recurrenceEndDate) : null,
      recurrenceCount: parsed.recurrenceCount || null,
    },
    include: {
      sender: { select: { id: true, name: true, email: true, microsoftId: true } },
      sendLogs: true,
    },
  });

  res.status(201).json(followUp);
}));

// PATCH /:id — Update follow-up
router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  await verifyTaskAccess(req);
  const { id } = req.params;
  const user = req.user!;

  const existing = await prisma.taskEmailFollowUp.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Follow-up not found');

  // Ownership check: sender or ED/SUPER_ADMIN
  if (existing.senderId !== user.id && user.role !== 'ED' && user.role !== 'SUPER_ADMIN') {
    throw new AppError(403, 'Only the sender or an admin can edit this follow-up');
  }

  const parsed = updateEmailFollowUpSchema.parse(req.body);

  // Build update data
  const data: Record<string, any> = {};
  if (parsed.recipientEmails !== undefined) data.recipientEmails = JSON.stringify(parsed.recipientEmails);
  if (parsed.subject !== undefined) data.subject = parsed.subject;
  if (parsed.body !== undefined) data.body = parsed.body;
  if (parsed.sendAt !== undefined) data.sendAt = parsed.sendAt ? new Date(parsed.sendAt) : null;
  if (parsed.recurrenceType !== undefined) data.recurrenceType = parsed.recurrenceType;
  if (parsed.recurrenceInterval !== undefined) data.recurrenceInterval = parsed.recurrenceInterval;
  if (parsed.recurrenceDays !== undefined) data.recurrenceDays = parsed.recurrenceDays;
  if (parsed.recurrenceEndDate !== undefined) data.recurrenceEndDate = parsed.recurrenceEndDate ? new Date(parsed.recurrenceEndDate) : null;
  if (parsed.recurrenceCount !== undefined) data.recurrenceCount = parsed.recurrenceCount;
  if (parsed.isActive !== undefined) data.isActive = parsed.isActive;

  // Recompute nextSendDate if schedule changed
  const hasScheduleChange = parsed.recurrenceType !== undefined || parsed.sendAt !== undefined
    || parsed.recurrenceInterval !== undefined || parsed.recurrenceDays !== undefined;

  if (hasScheduleChange) {
    const merged = {
      recurrenceType: data.recurrenceType ?? existing.recurrenceType,
      recurrenceInterval: data.recurrenceInterval ?? existing.recurrenceInterval,
      recurrenceDays: data.recurrenceDays ?? existing.recurrenceDays,
      recurrenceEndDate: data.recurrenceEndDate !== undefined ? data.recurrenceEndDate : existing.recurrenceEndDate,
      recurrenceCount: data.recurrenceCount !== undefined ? data.recurrenceCount : existing.recurrenceCount,
      sendAt: data.sendAt !== undefined ? data.sendAt : existing.sendAt,
    };

    if (merged.recurrenceType) {
      const fakeTask = {
        recurrenceType: merged.recurrenceType,
        recurrenceInterval: merged.recurrenceInterval || 1,
        recurrenceDays: merged.recurrenceDays || null,
        recurrenceStartDate: null,
        recurrenceEndDate: merged.recurrenceEndDate,
        recurrenceCount: merged.recurrenceCount,
        recurrenceOccurrences: existing.sendCount,
        nextRecurrenceDate: existing.nextSendDate,
        dueDate: merged.sendAt || new Date(),
      };
      data.nextSendDate = calculateNextRecurrenceDate(fakeTask);
    } else if (merged.sendAt) {
      data.nextSendDate = merged.sendAt;
    } else {
      data.nextSendDate = null;
    }
  }

  const updated = await prisma.taskEmailFollowUp.update({
    where: { id },
    data,
    include: {
      sender: { select: { id: true, name: true, email: true, microsoftId: true } },
      sendLogs: {
        orderBy: { sentAt: 'desc' },
        take: 5,
      },
    },
  });

  res.json(updated);
}));

// DELETE /:id — Delete follow-up
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  await verifyTaskAccess(req);
  const { id } = req.params;
  const user = req.user!;

  const existing = await prisma.taskEmailFollowUp.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Follow-up not found');

  if (existing.senderId !== user.id && user.role !== 'ED' && user.role !== 'SUPER_ADMIN') {
    throw new AppError(403, 'Only the sender or an admin can delete this follow-up');
  }

  await prisma.taskEmailFollowUp.delete({ where: { id } });
  res.json({ success: true });
}));

// POST /:id/send-now — Immediate send
router.post('/:id/send-now', asyncHandler(async (req: Request, res: Response) => {
  await verifyTaskAccess(req);
  const { id } = req.params;
  const user = req.user!;

  const followUp = await prisma.taskEmailFollowUp.findUnique({
    where: { id },
    include: {
      sender: { select: { id: true, microsoftId: true, name: true } },
    },
  });

  if (!followUp) throw new AppError(404, 'Follow-up not found');

  if (followUp.senderId !== user.id && user.role !== 'ED' && user.role !== 'SUPER_ADMIN') {
    throw new AppError(403, 'Only the sender or an admin can send this follow-up');
  }

  if (!followUp.sender.microsoftId) {
    throw new AppError(400, 'Sender account is not linked to Microsoft 365');
  }

  const recipients: string[] = JSON.parse(followUp.recipientEmails);

  const result = await sendMailAsUser({
    senderMicrosoftId: followUp.sender.microsoftId,
    toRecipients: recipients,
    subject: followUp.subject,
    htmlBody: followUp.body,
  });

  await prisma.emailFollowUpLog.create({
    data: {
      followUpId: followUp.id,
      recipientEmails: followUp.recipientEmails,
      status: result.success ? 'sent' : 'failed',
      errorMessage: result.error || null,
    },
  });

  if (!result.success) {
    throw new AppError(502, `Failed to send email: ${result.error}`);
  }

  res.json({ success: true, message: 'Email sent successfully' });
}));

export default router;
