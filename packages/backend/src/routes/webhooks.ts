import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// POST /email - Resend inbound email webhook (no auth required)
router.post('/email', asyncHandler(async (req: Request, res: Response) => {
  const { from, to, subject, text } = req.body;

  if (!text || !from) {
    res.json({ status: 'ignored', reason: 'missing fields' });
    return;
  }

  // Parse reply body for status keywords
  const body = text.trim().toUpperCase();
  let newStatus: string | null = null;

  if (body.startsWith('DONE') || body.includes('COMPLETED')) {
    newStatus = 'Done';
  } else if (body.startsWith('IN PROGRESS') || body.startsWith('WORKING')) {
    newStatus = 'In Progress';
  } else if (body.startsWith('BLOCKED') || body.startsWith('STUCK')) {
    newStatus = 'Blocked';
  }

  // Extract task ID from subject line (format: [GTMS-<id>])
  const taskIdMatch = subject?.match(/\[GTMS-([a-f0-9-]+)\]/i);
  if (!taskIdMatch) {
    res.json({ status: 'ignored', reason: 'no task ID in subject' });
    return;
  }

  const taskId = taskIdMatch[1];
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    res.json({ status: 'ignored', reason: 'task not found' });
    return;
  }

  // Find user by email
  const fromEmail = from.match(/<([^>]+)>/)?.[1] || from;
  const user = await prisma.user.findUnique({ where: { email: fromEmail } });

  if (newStatus) {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        completedAt: newStatus === 'Done' ? new Date() : null,
      },
    });
  }

  // Add note with email reply content
  await prisma.note.create({
    data: {
      taskId,
      content: `Email reply from ${fromEmail}: ${text.substring(0, 1000)}`,
      type: newStatus ? 'Status Update' : 'Comment',
      authorId: user?.id || task.createdById,
    },
  });

  res.json({ status: 'processed', taskId, newStatus });
}));

export default router;
