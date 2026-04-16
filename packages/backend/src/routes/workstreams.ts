import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { authorize } from '../middleware/auth';
import { getVisibleTaskFilter } from '../middleware/rbac';
import { AppError } from '../middleware/error';

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
      department: { select: { id: true, name: true, code: true, color: true } },
      _count: { select: { tasks: true } },
    },
  });

  res.json(workstreams);
}));

// GET /:id - workstream detail with tasks
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const rbacFilter = await getVisibleTaskFilter(req.user!);

  const workstream = await prisma.workstream.findUnique({
    where: { id: req.params.id },
    include: {
      department: { select: { id: true, name: true, code: true, color: true } },
      tasks: {
        where: rbacFilter,
        include: {
          assignee: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      },
    },
  });

  if (!workstream) throw new AppError(404, 'Workstream not found');

  res.json(workstream);
}));

// POST / - create workstream (ED only)
router.post('/', authorize('SUPER_ADMIN', 'ED'), asyncHandler(async (req: Request, res: Response) => {
  const { code, name, description, color, sortOrder, departmentId, addDepartmentMembers } = req.body;
  if (!code || !name) throw new AppError(400, 'code and name are required');

  const maxSort = await prisma.workstream.aggregate({ _max: { sortOrder: true } });
  const workstream = await prisma.workstream.create({
    data: {
      code: code.toUpperCase(),
      name,
      description: description || null,
      color: color || '#6366f1',
      sortOrder: sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
      departmentId: departmentId || null,
    },
    include: {
      department: { select: { id: true, name: true, code: true, color: true } },
    },
  });

  let _membersAdded = 0;
  if (addDepartmentMembers && departmentId) {
    const deptUsers = await prisma.user.findMany({
      where: { departmentId, isActive: true },
      select: { id: true },
    });
    if (deptUsers.length > 0) {
      const result = await prisma.workstreamMember.createMany({
        data: deptUsers.map(u => ({ userId: u.id, workstreamId: workstream.id, role: 'STAFF' })),
        skipDuplicates: true,
      });
      _membersAdded = result.count;
    }
  }

  res.status(201).json({ ...workstream, _membersAdded });
}));

// PATCH /:id - update workstream (ED only)
router.patch('/:id', authorize('SUPER_ADMIN', 'ED'), asyncHandler(async (req: Request, res: Response) => {
  const { code, name, description, color, sortOrder, departmentId, addDepartmentMembers } = req.body;
  const workstream = await prisma.workstream.update({
    where: { id: req.params.id },
    data: {
      ...(code !== undefined && { code: code.toUpperCase() }),
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(color !== undefined && { color }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(departmentId !== undefined && { departmentId: departmentId || null }),
    },
    include: {
      department: { select: { id: true, name: true, code: true, color: true } },
    },
  });

  let _membersAdded = 0;
  if (addDepartmentMembers && departmentId) {
    const deptUsers = await prisma.user.findMany({
      where: { departmentId, isActive: true },
      select: { id: true },
    });
    if (deptUsers.length > 0) {
      const result = await prisma.workstreamMember.createMany({
        data: deptUsers.map(u => ({ userId: u.id, workstreamId: workstream.id, role: 'STAFF' })),
        skipDuplicates: true,
      });
      _membersAdded = result.count;
    }
  }

  res.json({ ...workstream, _membersAdded });
}));

// DELETE /:id - delete workstream (ED only, only if no tasks)
router.delete('/:id', authorize('SUPER_ADMIN', 'ED'), asyncHandler(async (req: Request, res: Response) => {
  const count = await prisma.task.count({ where: { workstreamId: req.params.id } });
  if (count > 0) throw new AppError(400, `Cannot delete workstream with ${count} tasks. Reassign tasks first.`);

  await prisma.workstream.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

export default router;
