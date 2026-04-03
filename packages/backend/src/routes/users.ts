import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AppError } from '../middleware/error';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// GET / - list active users
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      position: true,
      department: true,
    },
    orderBy: { name: 'asc' },
  });

  res.json(users);
}));

// GET /:id - user detail with task summary
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      position: true,
      department: true,
      assignedTasks: {
        where: { status: { notIn: ['Done', 'Cancelled'] } },
        include: { workstream: true },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      },
    },
  });

  if (!user) throw new AppError(404, 'User not found');
  res.json(user);
}));

export default router;
