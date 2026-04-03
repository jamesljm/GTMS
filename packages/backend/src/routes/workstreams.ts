import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// GET / - list all workstreams with task counts
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const workstreams = await prisma.workstream.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { tasks: true } },
    },
  });

  res.json(workstreams);
}));

// GET /:id - workstream detail with tasks
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const workstream = await prisma.workstream.findUnique({
    where: { id: req.params.id },
    include: {
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      },
    },
  });

  if (!workstream) {
    res.status(404).json({ error: 'Workstream not found' });
    return;
  }

  res.json(workstream);
}));

export default router;
