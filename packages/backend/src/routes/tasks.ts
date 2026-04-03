import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { validate } from '../middleware/validate';
import { createTaskSchema, updateTaskSchema, taskFilterSchema } from 'shared';
import { AppError } from '../middleware/error';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

const taskInclude = {
  workstream: true,
  assignee: { select: { id: true, name: true, email: true, role: true, position: true, department: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  parent: { select: { id: true, title: true } },
  subtasks: { select: { id: true, title: true, status: true, priority: true, dueDate: true, assignee: { select: { id: true, name: true } } } },
  attachments: { select: { id: true, filename: true, mimeType: true, size: true, createdAt: true } },
  _count: { select: { notes: true, subtasks: true, attachments: true } },
};

// GET / - list tasks with filters
router.get('/', validate(taskFilterSchema, 'query'), asyncHandler(async (req: Request, res: Response) => {
  const { status, priority, type, workstreamId, assigneeId, search, dueBefore, dueAfter, page, limit, sortBy, sortOrder } = req.query as any;

  const where: any = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (type) where.type = type;
  if (workstreamId) where.workstreamId = workstreamId;
  if (assigneeId) where.assigneeId = assigneeId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (dueBefore || dueAfter) {
    where.dueDate = {};
    if (dueBefore) where.dueDate.lte = new Date(dueBefore);
    if (dueAfter) where.dueDate.gte = new Date(dueAfter);
  }

  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);

  res.json({
    tasks,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}));

// GET /today - today's focus (due today or overdue + in progress)
router.get('/today', asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { dueDate: { lte: endOfDay }, status: { notIn: ['Done', 'Cancelled'] } },
        { status: 'In Progress' },
      ],
    },
    include: taskInclude,
    orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
  });

  res.json(tasks);
}));

// GET /waiting - waiting on others
router.get('/waiting', asyncHandler(async (req: Request, res: Response) => {
  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { type: 'Waiting On' },
        { status: 'Waiting On' },
      ],
      status: { notIn: ['Done', 'Cancelled'] },
    },
    include: taskInclude,
    orderBy: [{ dueDate: 'asc' }],
  });

  res.json(tasks);
}));

// GET /by-workstream - tasks grouped by workstream
router.get('/by-workstream', asyncHandler(async (req: Request, res: Response) => {
  const workstreams = await prisma.workstream.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      tasks: {
        where: { status: { notIn: ['Done', 'Cancelled'] } },
        include: taskInclude,
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      },
    },
  });

  res.json(workstreams);
}));

// GET /by-assignee - tasks grouped by assignee
router.get('/by-assignee', asyncHandler(async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
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

  res.json(users.filter(u => u.assignedTasks.length > 0));
}));

// GET /:id - task detail
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: {
      ...taskInclude,
      notes: {
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!task) throw new AppError(404, 'Task not found');
  res.json(task);
}));

// POST / - create task
router.post('/', validate(createTaskSchema), asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      type: data.type,
      status: data.status,
      priority: data.priority,
      source: data.source,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      assigneeId: data.assigneeId,
      workstreamId: data.workstreamId,
      parentId: data.parentId,
      waitingOnWhom: data.waitingOnWhom,
      recurringCron: data.recurringCron,
      createdById: req.user!.id,
    },
    include: taskInclude,
  });

  res.status(201).json(task);
}));

// PATCH /:id - update task
router.patch('/:id', validate(updateTaskSchema), asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, 'Task not found');

  const data: any = { ...req.body };
  if (data.dueDate !== undefined) {
    data.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }

  // Set completedAt when marking as done
  if (data.status === 'Done' && existing.status !== 'Done') {
    data.completedAt = new Date();
  }
  if (data.status && data.status !== 'Done') {
    data.completedAt = null;
  }

  const task = await prisma.task.update({
    where: { id: req.params.id },
    data,
    include: taskInclude,
  });

  res.json(task);
}));

// DELETE /:id - delete task
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, 'Task not found');

  await prisma.task.delete({ where: { id: req.params.id } });
  res.json({ message: 'Task deleted' });
}));

export default router;
