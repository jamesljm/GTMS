import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { getVisibleTaskFilter } from '../middleware/rbac';

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

  const rbacFilter = await getVisibleTaskFilter(req.user!);

  const [total, notStarted, inProgress, waitingOn, blocked, done, overdue, dueThisWeek, critical] = await Promise.all([
    prisma.task.count({ where: { AND: [rbacFilter, { status: { notIn: ['Done', 'Cancelled'] } }] } }),
    prisma.task.count({ where: { AND: [rbacFilter, { status: 'Not Started' }] } }),
    prisma.task.count({ where: { AND: [rbacFilter, { status: 'In Progress' }] } }),
    prisma.task.count({ where: { AND: [rbacFilter, { OR: [{ status: 'Waiting On' }, { type: 'Waiting On' }], status: { notIn: ['Done', 'Cancelled'] } }] } }),
    prisma.task.count({ where: { AND: [rbacFilter, { status: 'Blocked' }] } }),
    prisma.task.count({ where: { AND: [rbacFilter, { status: 'Done' }] } }),
    prisma.task.count({ where: { AND: [rbacFilter, { dueDate: { lt: now }, status: { notIn: ['Done', 'Cancelled'] } }] } }),
    prisma.task.count({ where: { AND: [rbacFilter, { dueDate: { lte: endOfWeek, gte: now }, status: { notIn: ['Done', 'Cancelled'] } }] } }),
    prisma.task.count({ where: { AND: [rbacFilter, { priority: 'Critical', status: { notIn: ['Done', 'Cancelled'] } }] } }),
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

  const rbacFilter = await getVisibleTaskFilter(req.user!);

  const tasks = await prisma.task.findMany({
    where: {
      AND: [
        rbacFilter,
        {
          OR: [
            { dueDate: { lte: endOfDay }, status: { notIn: ['Done', 'Cancelled'] } },
            { status: 'In Progress' },
            { priority: 'Critical', status: { notIn: ['Done', 'Cancelled'] } },
          ],
        },
      ],
    },
    include: {
      workstream: { include: { department: { select: { id: true, name: true, code: true, color: true } } } },
      assignee: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    take: 20,
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
          OR: [{ type: 'Waiting On' }, { status: 'Waiting On' }],
          status: { notIn: ['Done', 'Cancelled'] },
        },
      ],
    },
    include: {
      workstream: { include: { department: { select: { id: true, name: true, code: true, color: true } } } },
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

  const rbacFilter = await getVisibleTaskFilter(req.user!);

  const tasks = await prisma.task.findMany({
    where: {
      AND: [
        rbacFilter,
        {
          priority: 'Critical',
          status: { notIn: ['Done', 'Cancelled'] },
        },
      ],
    },
    include: {
      workstream: { include: { department: { select: { id: true, name: true, code: true, color: true } } } },
      assignee: { select: { id: true, name: true, email: true } },
    },
    orderBy: { dueDate: 'asc' },
  });

  res.json(tasks);
}));

// GET /workstream-summary - task counts by workstream
router.get('/workstream-summary', asyncHandler(async (req: Request, res: Response) => {
  const rbacFilter = await getVisibleTaskFilter(req.user!);

  const workstreams = await prisma.workstream.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      department: { select: { id: true, name: true, code: true } },
      _count: {
        select: { tasks: true },
      },
      tasks: {
        select: { status: true, priority: true },
        where: { AND: [rbacFilter, { status: { notIn: ['Done', 'Cancelled'] } }] },
      },
    },
  });

  const summary = workstreams.map(ws => ({
    id: ws.id,
    code: ws.code,
    name: ws.name,
    color: ws.color,
    departmentId: ws.departmentId,
    departmentName: ws.department?.name || null,
    departmentCode: ws.department?.code || null,
    totalTasks: ws._count.tasks,
    activeTasks: ws.tasks.length,
    criticalTasks: ws.tasks.filter(t => t.priority === 'Critical').length,
    inProgressTasks: ws.tasks.filter(t => t.status === 'In Progress').length,
  }));

  res.json(summary);
}));

// GET /department-summary - task counts rolled up by department
router.get('/department-summary', asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const rbacFilter = await getVisibleTaskFilter(req.user!);

  const departments = await prisma.department.findMany({
    where: {
      workstreams: { some: {} }, // only departments with linked workstreams
    },
    orderBy: { name: 'asc' },
    include: {
      workstreams: {
        select: {
          id: true,
          tasks: {
            select: { status: true, priority: true, dueDate: true },
            where: { AND: [rbacFilter, { status: { notIn: ['Done', 'Cancelled'] } }] },
          },
        },
      },
    },
  });

  const summary = departments.map(dept => {
    const allTasks = dept.workstreams.flatMap(ws => ws.tasks);
    return {
      id: dept.id,
      name: dept.name,
      code: dept.code,
      color: dept.color,
      workstreamCount: dept.workstreams.length,
      totalTasks: allTasks.length,
      activeTasks: allTasks.filter(t => t.status === 'In Progress').length,
      overdueTasks: allTasks.filter(t => t.dueDate && t.dueDate < now).length,
      criticalTasks: allTasks.filter(t => t.priority === 'Critical').length,
      inProgressTasks: allTasks.filter(t => t.status === 'In Progress').length,
    };
  });

  res.json(summary);
}));

// GET /team-summary - task counts by team member
router.get('/team-summary', asyncHandler(async (req: Request, res: Response) => {
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
    department: (u as any).dept?.name || null,
    departmentId: u.departmentId,
    totalAssigned: u._count.assignedTasks,
    activeTasks: u.assignedTasks.length,
    overdueTasks: u.assignedTasks.filter(t => t.dueDate && t.dueDate < now).length,
    criticalTasks: u.assignedTasks.filter(t => t.priority === 'Critical').length,
  }));

  res.json(summary);
}));

export default router;
