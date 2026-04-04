import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { validate } from '../middleware/validate';
import { createDepartmentSchema, updateDepartmentSchema } from 'shared';
import { authorize } from '../middleware/auth';
import { AppError } from '../middleware/error';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// GET / - list all departments
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const departments = await prisma.department.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      head: { select: { id: true, name: true, email: true, role: true, position: true } },
      _count: { select: { members: true } },
    },
  });
  res.json(departments);
}));

// GET /:id - department detail
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const dept = await prisma.department.findUnique({
    where: { id: req.params.id },
    include: {
      head: { select: { id: true, name: true, email: true, role: true, position: true } },
      members: {
        where: { isActive: true },
        select: { id: true, name: true, email: true, role: true, position: true },
        orderBy: { name: 'asc' },
      },
    },
  });
  if (!dept) throw new AppError(404, 'Department not found');
  res.json(dept);
}));

// POST / - create (ED only)
router.post('/', authorize('ED'), validate(createDepartmentSchema), asyncHandler(async (req: Request, res: Response) => {
  const dept = await prisma.department.create({
    data: {
      name: req.body.name,
      code: req.body.code.toUpperCase(),
      description: req.body.description || null,
      color: req.body.color || '#6366f1',
      headId: req.body.headId || null,
      sortOrder: await prisma.department.count(),
    },
    include: {
      head: { select: { id: true, name: true, email: true } },
    },
  });
  res.status(201).json(dept);
}));

// PATCH /:id - update (ED only)
router.patch('/:id', authorize('ED'), validate(updateDepartmentSchema), asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.department.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, 'Department not found');

  const dept = await prisma.department.update({
    where: { id: req.params.id },
    data: {
      ...(req.body.name !== undefined && { name: req.body.name }),
      ...(req.body.code !== undefined && { code: req.body.code.toUpperCase() }),
      ...(req.body.description !== undefined && { description: req.body.description }),
      ...(req.body.color !== undefined && { color: req.body.color }),
      ...(req.body.headId !== undefined && { headId: req.body.headId }),
    },
    include: {
      head: { select: { id: true, name: true, email: true } },
      _count: { select: { members: true } },
    },
  });
  res.json(dept);
}));

// DELETE /:id - delete (ED only, no members)
router.delete('/:id', authorize('ED'), asyncHandler(async (req: Request, res: Response) => {
  const count = await prisma.user.count({ where: { departmentId: req.params.id } });
  if (count > 0) {
    throw new AppError(400, `Cannot delete department with ${count} members. Reassign them first.`);
  }
  await prisma.department.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

export default router;
