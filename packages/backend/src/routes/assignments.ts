import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AppError } from '../middleware/error';
import { canManageUsers } from '../middleware/rbac';

const router = Router({ mergeParams: true });

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// GET /api/v1/users/:userId/assignments
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const assignments = await prisma.userAssignment.findMany({
    where: { userId },
    include: { department: { select: { id: true, name: true, code: true, color: true } } },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });

  res.json(assignments);
}));

// POST /api/v1/users/:userId/assignments
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const currentUser = req.user!;

  if (!canManageUsers(currentUser)) {
    throw new AppError(403, 'Insufficient permissions');
  }

  // HOD can only add assignments to own dept
  if (currentUser.role === 'HOD' && req.body.departmentId !== currentUser.departmentId) {
    throw new AppError(403, 'HOD can only add assignments within own department');
  }

  const { departmentId, role, position, isPrimary } = req.body;
  if (!departmentId || !role) {
    res.status(400).json({ error: 'departmentId and role are required' });
    return;
  }

  const assignment = await prisma.userAssignment.create({
    data: { userId, departmentId, role, position: position || null, isPrimary: isPrimary || false },
    include: { department: { select: { id: true, name: true, code: true, color: true } } },
  });

  // If isPrimary, update User's primary fields
  if (isPrimary) {
    await prisma.userAssignment.updateMany({
      where: { userId, id: { not: assignment.id } },
      data: { isPrimary: false },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { role, position: position || null, departmentId },
    });
  }

  res.status(201).json(assignment);
}));

// PATCH /api/v1/users/:userId/assignments/:id
router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { userId, id } = req.params;
  const currentUser = req.user!;

  if (!canManageUsers(currentUser)) {
    throw new AppError(403, 'Insufficient permissions');
  }

  const existing = await prisma.userAssignment.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, 'Assignment not found');

  if (currentUser.role === 'HOD' && existing.departmentId !== currentUser.departmentId) {
    throw new AppError(403, 'HOD can only edit assignments within own department');
  }

  const { departmentId, role, position, isPrimary } = req.body;

  const assignment = await prisma.userAssignment.update({
    where: { id },
    data: {
      ...(departmentId !== undefined && { departmentId }),
      ...(role !== undefined && { role }),
      ...(position !== undefined && { position }),
      ...(isPrimary !== undefined && { isPrimary }),
    },
    include: { department: { select: { id: true, name: true, code: true, color: true } } },
  });

  // If setting as primary, unset others and update User
  if (isPrimary) {
    await prisma.userAssignment.updateMany({
      where: { userId, id: { not: id } },
      data: { isPrimary: false },
    });
    await prisma.user.update({
      where: { id: userId },
      data: {
        role: assignment.role,
        position: assignment.position,
        departmentId: assignment.departmentId,
      },
    });
  }

  res.json(assignment);
}));

// DELETE /api/v1/users/:userId/assignments/:id
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { userId, id } = req.params;
  const currentUser = req.user!;

  if (!canManageUsers(currentUser)) {
    throw new AppError(403, 'Insufficient permissions');
  }

  const existing = await prisma.userAssignment.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, 'Assignment not found');

  await prisma.userAssignment.delete({ where: { id } });

  // If deleted the primary, make another one primary (or clear primary dept on user if none left)
  if (existing.isPrimary) {
    const next = await prisma.userAssignment.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
    if (next) {
      await prisma.userAssignment.update({ where: { id: next.id }, data: { isPrimary: true } });
      await prisma.user.update({ where: { id: userId }, data: { departmentId: next.departmentId } });
    } else {
      await prisma.user.update({ where: { id: userId }, data: { departmentId: null } });
    }
  }

  res.json({ ok: true });
}));

export default router;
