import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { validate } from '../middleware/validate';
import { addNoteSchema } from 'shared';
import { AppError } from '../middleware/error';
import { getVisibleTaskFilter } from '../middleware/rbac';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// POST / - add note to a task
router.post('/', validate(addNoteSchema), asyncHandler(async (req: Request, res: Response) => {
  const { taskId, content, type } = req.body;

  const rbacFilter = await getVisibleTaskFilter(req.user!);
  const task = await prisma.task.findFirst({ where: { AND: [{ id: taskId }, rbacFilter] } });
  if (!task) throw new AppError(404, 'Task not found');

  const note = await prisma.note.create({
    data: {
      taskId,
      content,
      type,
      authorId: req.user!.id,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  res.status(201).json(note);
}));

// GET /task/:taskId - list notes for a task
router.get('/task/:taskId', asyncHandler(async (req: Request, res: Response) => {
  // Verify user has access to the task
  const rbacFilter = await getVisibleTaskFilter(req.user!);
  const task = await prisma.task.findFirst({ where: { AND: [{ id: req.params.taskId }, rbacFilter] } });
  if (!task) throw new AppError(404, 'Task not found');

  const notes = await prisma.note.findMany({
    where: { taskId: req.params.taskId },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(notes);
}));

export default router;
