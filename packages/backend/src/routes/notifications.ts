import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AppError } from '../middleware/error';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// Helper to create notifications (called from task routes)
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  taskId?: string,
) {
  return prisma.notification.create({
    data: { userId, type, title, message, taskId },
  });
}

// GET / - list notifications for current user
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { task: { select: { id: true, title: true, status: true } } },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { userId: req.user!.id } }),
  ]);

  res.json({ notifications, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

// GET /unread-count
router.get('/unread-count', asyncHandler(async (req: Request, res: Response) => {
  const count = await prisma.notification.count({
    where: { userId: req.user!.id, isRead: false },
  });
  res.json({ count });
}));

// PATCH /:id/read - mark single as read
router.patch('/:id/read', asyncHandler(async (req: Request, res: Response) => {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notification) throw new AppError(404, 'Notification not found');
  if (notification.userId !== req.user!.id) throw new AppError(403, 'Not your notification');

  await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
  res.json({ message: 'Marked as read' });
}));

// POST /mark-all-read
router.post('/mark-all-read', asyncHandler(async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, isRead: false },
    data: { isRead: true },
  });
  res.json({ message: 'All notifications marked as read' });
}));

export default router;
