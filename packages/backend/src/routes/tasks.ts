import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { validate } from '../middleware/validate';
import { createTaskSchema, updateTaskSchema, taskFilterSchema } from 'shared';
import { AppError } from '../middleware/error';
import { getVisibleTaskFilter, canEditTask } from '../middleware/rbac';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

const taskInclude = {
  workstream: true,
  assignee: { select: { id: true, name: true, email: true, role: true, position: true, departmentId: true, dept: { select: { id: true, name: true } } } },
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
    if (dueBefore === 'overdue') {
      // Tasks due before now (overdue)
      where.dueDate.lt = new Date();
      where.status = { notIn: ['Done', 'Cancelled'] };
    } else if (dueBefore === 'thisWeek') {
      // Tasks due by end of this week
      const endOfWeek = new Date();
      endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
      endOfWeek.setHours(23, 59, 59, 999);
      where.dueDate.lte = endOfWeek;
      where.status = { notIn: ['Done', 'Cancelled'] };
    } else if (dueBefore) {
      where.dueDate.lte = new Date(dueBefore);
    }
    if (dueAfter) where.dueDate.gte = new Date(dueAfter);
  }

  const rbacFilter = await getVisibleTaskFilter(req.user!);
  const combinedWhere = { AND: [rbacFilter, where] };

  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where: combinedWhere,
      include: taskInclude,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.task.count({ where: combinedWhere }),
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

  const rbacFilter = await getVisibleTaskFilter(req.user!);

  const tasks = await prisma.task.findMany({
    where: {
      AND: [
        rbacFilter,
        {
          OR: [
            { dueDate: { lte: endOfDay }, status: { notIn: ['Done', 'Cancelled'] } },
            { status: 'In Progress' },
          ],
        },
      ],
    },
    include: taskInclude,
    orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
  });

  res.json(tasks);
}));

// GET /waiting - waiting on others
router.get('/waiting', asyncHandler(async (req: Request, res: Response) => {
  const rbacFilter = await getVisibleTaskFilter(req.user!);

  const tasks = await prisma.task.findMany({
    where: {
      AND: [
        rbacFilter,
        {
          OR: [
            { type: 'Waiting On' },
            { status: 'Waiting On' },
          ],
          status: { notIn: ['Done', 'Cancelled'] },
        },
      ],
    },
    include: taskInclude,
    orderBy: [{ dueDate: 'asc' }],
  });

  res.json(tasks);
}));

// GET /by-workstream - tasks grouped by workstream
router.get('/by-workstream', asyncHandler(async (req: Request, res: Response) => {
  const rbacFilter = await getVisibleTaskFilter(req.user!);

  const workstreams = await prisma.workstream.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      tasks: {
        where: { AND: [rbacFilter, { status: { notIn: ['Done', 'Cancelled'] } }] },
        include: taskInclude,
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      },
    },
  });

  res.json(workstreams);
}));

// GET /by-assignee - tasks grouped by assignee
router.get('/by-assignee', asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;

  // Scope user list by role
  let userWhere: any = { isActive: true };
  if (user.role === 'HOD' || user.role === 'MANAGER') {
    if (user.departmentId) {
      userWhere = { isActive: true, departmentId: user.departmentId };
    } else {
      userWhere = { isActive: true, id: user.id };
    }
  } else if (user.role === 'STAFF') {
    userWhere = { isActive: true, id: user.id };
  }
  // ED sees all active users

  const users = await prisma.user.findMany({
    where: userWhere,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      position: true,
      departmentId: true,
      dept: { select: { id: true, name: true } },
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
  const rbacFilter = await getVisibleTaskFilter(req.user!);

  const task = await prisma.task.findFirst({
    where: { AND: [{ id: req.params.id }, rbacFilter] },
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

  // RBAC check
  const allowed = await canEditTask(req.user!, existing);
  if (!allowed) throw new AppError(403, 'You do not have permission to edit this task');

  const data: any = { ...req.body };

  // STAFF can only update status
  if (req.user!.role === 'STAFF' && existing.assigneeId !== req.user!.id && existing.createdById !== req.user!.id) {
    throw new AppError(403, 'You do not have permission to edit this task');
  }
  if (req.user!.role === 'STAFF') {
    const allowedFields = ['status'];
    const attemptedFields = Object.keys(data);
    const disallowed = attemptedFields.filter(f => !allowedFields.includes(f));
    if (disallowed.length > 0) {
      throw new AppError(403, `Staff can only update status. Cannot update: ${disallowed.join(', ')}`);
    }
  }

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

// DELETE /:id - delete task (ED or task creator only)
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, 'Task not found');

  if (req.user!.role !== 'ED' && existing.createdById !== req.user!.id) {
    throw new AppError(403, 'Only ED or the task creator can delete tasks');
  }

  await prisma.task.delete({ where: { id: req.params.id } });
  res.json({ message: 'Task deleted' });
}));

export default router;
