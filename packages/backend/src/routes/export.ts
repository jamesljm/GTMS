import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AppError } from '../middleware/error';
import { getVisibleTaskFilter } from '../middleware/rbac';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

function escapeCsvField(value: string | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// GET /api/v1/export/tasks?format=csv
router.get('/tasks', asyncHandler(async (req: Request, res: Response) => {
  const { status, priority, workstreamId, assigneeId } = req.query as any;

  const where: any = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (workstreamId) where.workstreamId = workstreamId;
  if (assigneeId) where.assigneeId = assigneeId;

  const rbacFilter = await getVisibleTaskFilter(req.user!);
  const combinedWhere = { AND: [rbacFilter, where] };

  const tasks = await prisma.task.findMany({
    where: combinedWhere,
    include: {
      workstream: { select: { name: true, code: true } },
      assignee: { select: { name: true, email: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  const date = new Date().toISOString().split('T')[0];
  const headers = ['Title', 'Description', 'Type', 'Status', 'Priority', 'Due Date', 'Assignee', 'Workstream', 'Created By', 'Created At', 'Completed At'];

  const rows = tasks.map(t => [
    escapeCsvField(t.title),
    escapeCsvField(t.description),
    escapeCsvField(t.type),
    escapeCsvField(t.status),
    escapeCsvField(t.priority),
    escapeCsvField(t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : ''),
    escapeCsvField(t.assignee?.name || 'Unassigned'),
    escapeCsvField(t.workstream ? `${t.workstream.code} - ${t.workstream.name}` : ''),
    escapeCsvField(t.createdBy?.name || ''),
    escapeCsvField(new Date(t.createdAt).toISOString().split('T')[0]),
    escapeCsvField(t.completedAt ? new Date(t.completedAt).toISOString().split('T')[0] : ''),
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=gtms-tasks-${date}.csv`);
  res.send(csv);
}));

// GET /api/v1/export/database (ED only)
router.get('/database', asyncHandler(async (req: Request, res: Response) => {
  if (req.user!.role !== 'SUPER_ADMIN' && req.user!.role !== 'ED') {
    throw new AppError(403, 'Only ED or SUPER_ADMIN can export the full database');
  }

  const [tasks, users, departments, workstreams, notes, assignments] = await Promise.all([
    prisma.task.findMany({
      include: {
        workstream: { select: { code: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.user.findMany({
      select: {
        id: true, email: true, name: true, role: true, position: true, phone: true,
        isActive: true, departmentId: true, createdAt: true, updatedAt: true,
        dept: { select: { id: true, name: true, code: true } },
      },
    }),
    prisma.department.findMany({
      include: {
        head: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
    }),
    prisma.workstream.findMany(),
    prisma.note.findMany({
      include: { author: { select: { id: true, name: true } } },
    }),
    prisma.userAssignment.findMany({
      include: { department: { select: { id: true, name: true, code: true } } },
    }),
  ]);

  const date = new Date().toISOString().split('T')[0];
  const data = { exportedAt: new Date().toISOString(), tasks, users, departments, workstreams, notes, assignments };

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=gtms-export-${date}.json`);
  res.json(data);
}));

export default router;
