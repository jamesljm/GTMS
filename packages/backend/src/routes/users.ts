import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { AppError } from '../middleware/error';
import { canManageUsers } from '../middleware/rbac';
import bcrypt from 'bcryptjs';

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
      departmentId: true,
      dept: { select: { id: true, name: true, code: true } },
      assignments: {
        include: { department: { select: { id: true, name: true, code: true, color: true } } },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
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
      departmentId: true,
      dept: { select: { id: true, name: true, code: true } },
      assignments: {
        include: { department: { select: { id: true, name: true, code: true, color: true } } },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
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

// POST / - create user
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  if (!canManageUsers(req.user!)) {
    throw new AppError(403, 'Insufficient permissions to manage users');
  }

  const { email, name, role, position, departmentId, password } = req.body;
  if (!email || !name) throw new AppError(400, 'email and name are required');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError(409, 'Email already in use');

  // HOD forces departmentId to own dept (SUPER_ADMIN and ED can assign any dept)
  let finalDepartmentId = departmentId || null;
  if (req.user!.role === 'HOD') {
    finalDepartmentId = req.user!.departmentId;
  }

  const generatedPassword = password || crypto.randomBytes(8).toString('base64url').slice(0, 12);
  const passwordHash = await bcrypt.hash(generatedPassword, 12);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      role: role || 'STAFF',
      position: position || '',
      departmentId: finalDepartmentId,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      position: true,
      departmentId: true,
      dept: { select: { id: true, name: true, code: true } },
    },
  });

  res.status(201).json({
    ...user,
    ...(password ? {} : { temporaryPassword: generatedPassword }),
  });
}));

// PATCH /:id - update user
router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!canManageUsers(req.user!)) {
    throw new AppError(403, 'Insufficient permissions to manage users');
  }

  const targetUser = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!targetUser) throw new AppError(404, 'User not found');

  // HOD can only edit own dept members
  if (req.user!.role === 'HOD') {
    if (targetUser.departmentId !== req.user!.departmentId) {
      throw new AppError(403, 'HOD can only edit members of their own department');
    }
  }

  const { name, email, role, position, departmentId } = req.body;

  // HOD cannot change roles
  if (req.user!.role === 'HOD' && role !== undefined) {
    throw new AppError(403, 'HOD cannot change user roles');
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(role !== undefined && { role }),
      ...(position !== undefined && { position }),
      ...(departmentId !== undefined && { departmentId }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      position: true,
      departmentId: true,
      dept: { select: { id: true, name: true, code: true } },
    },
  });

  res.json(user);
}));

// DELETE /:id - deactivate user (soft delete)
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!canManageUsers(req.user!)) {
    throw new AppError(403, 'Insufficient permissions to manage users');
  }

  // HOD can only delete own dept members
  if (req.user!.role === 'HOD') {
    const targetUser = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!targetUser) throw new AppError(404, 'User not found');
    if (targetUser.departmentId !== req.user!.departmentId) {
      throw new AppError(403, 'HOD can only deactivate members of their own department');
    }
  }

  await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  res.json({ ok: true });
}));

export default router;
