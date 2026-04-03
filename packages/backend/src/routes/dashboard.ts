import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// GET / - dashboard stats
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  const [total, notStarted, inProgress, waitingOn, blocked, done, overdue, dueThisWeek, critical] = await Promise.all([
    prisma.task.count({ where: { status: { notIn: ['Done', 'Cancelled'] } } }),
    prisma.task.count({ where: { status: 'Not Started' } }),
    prisma.task.count({ where: { status: 'In Progress' } }),
    prisma.task.count({ where: { OR: [{ status: 'Waiting On' }, { type: 'Waiting On' }], status: { notIn: ['Done', 'Cancelled'] } } }),
    prisma.task.count({ where: { status: 'Blocked' } }),
    prisma.task.count({ where: { status: 'Done' } }),
    prisma.task.count({ where: { dueDate: { lt: now }, status: { notIn: ['Done', 'Cancelled'] } } }),
    prisma.task.count({ where: { dueDate: { lte: endOfWeek, gte: now }, status: { notIn: ['Done', 'Cancelled'] } } }),
    prisma.task.count({ where: { priority: 'Critical', status: { notIn: ['Done', 'Cancelled'] } } }),
  ]);

  res.json({
    total,
    notStarted,
    inProgress,
    waitingOn,
    blocked,
    done,
    overdue,
    dueThisWeek,
    critical,
  });
}));

// GET /today - today's focus tasks
router.get('/today', asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { dueDate: { lte: endOfDay }, status: { notIn: ['Done', 'Cancelled'] } },
        { status: 'In Progress' },
        { priority: 'Critical', status: { notIn: ['Done', 'Cancelled'] } },
      ],
    },
    include: {
      workstream: true,
      assignee: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    take: 20,
  });

  res.json(tasks);
}));

// GET /waiting - waiting on others
router.get('/waiting', asyncHandler(async (req: Request, res: Response) => {
  const tasks = await prisma.task.findMany({
    where: {
      OR: [{ type: 'Waiting On' }, { status: 'Waiting On' }],
      status: { notIn: ['Done', 'Cancelled'] },
    },
    include: {
      workstream: true,
      assignee: { select: { id: true, name: true, email: true } },
    },
    orderBy: { dueDate: 'asc' },
  });

  res.json(tasks);
}));

// GET /critical - critical tasks this week
router.get('/critical', asyncHandler(async (req: Request, res: Response) => {
  const endOfWeek = new Date();
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const tasks = await prisma.task.findMany({
    where: {
      priority: 'Critical',
      status: { notIn: ['Done', 'Cancelled'] },
    },
    include: {
      workstream: true,
      assignee: { select: { id: true, name: true, email: true } },
    },
    orderBy: { dueDate: 'asc' },
  });

  res.json(tasks);
}));

// GET /workstream-summary - task counts by workstream
router.get('/workstream-summary', asyncHandler(async (req: Request, res: Response) => {
  const workstreams = await prisma.workstream.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: {
        select: { tasks: true },
      },
      tasks: {
        select: { status: true, priority: true },
        where: { status: { notIn: ['Done', 'Cancelled'] } },
      },
    },
  });

  const summary = workstreams.map(ws => ({
    id: ws.id,
    code: ws.code,
    name: ws.name,
    color: ws.color,
    totalTasks: ws._count.tasks,
    activeTasks: ws.tasks.length,
    criticalTasks: ws.tasks.filter(t => t.priority === 'Critical').length,
    inProgressTasks: ws.tasks.filter(t => t.status === 'In Progress').length,
  }));

  res.json(summary);
}));

// GET /team-summary - task counts by team member
router.get('/team-summary', asyncHandler(async (req: Request, res: Response) => {
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
      _count: {
        select: { assignedTasks: true },
      },
      assignedTasks: {
        select: { status: true, priority: true, dueDate: true },
        where: { status: { notIn: ['Done', 'Cancelled'] } },
      },
    },
  });

  const now = new Date();
  const summary = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    position: u.position,
    department: u.department,
    totalAssigned: u._count.assignedTasks,
    activeTasks: u.assignedTasks.length,
    overdueTasks: u.assignedTasks.filter(t => t.dueDate && t.dueDate < now).length,
    criticalTasks: u.assignedTasks.filter(t => t.priority === 'Critical').length,
  }));

  res.json(summary);
}));

export default router;
