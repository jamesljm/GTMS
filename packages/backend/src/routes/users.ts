import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { AppError } from '../middleware/error';
import { canManageUsers } from '../middleware/rbac';
import { logSecurityEvent } from './audit';
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

  // SUPER_ADMIN role is determined exclusively by Entra ID security group membership;
  // it cannot be assigned manually via this API.
  if (role === 'SUPER_ADMIN') {
    throw new AppError(403, 'SUPER_ADMIN role is managed by Entra ID security group, not editable here');
  }

  // Prevent anyone from demoting a SUPER_ADMIN through this endpoint —
  // demotion happens automatically when they're removed from the AD group.
  if (targetUser.role === 'SUPER_ADMIN') {
    throw new AppError(403, 'SUPER_ADMIN users are managed via Entra ID; cannot edit role here');
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

  // Log role changes specifically (high-impact privileged action)
  if (role !== undefined && role !== targetUser.role) {
    logSecurityEvent(req.user!.id, 'user.role_changed', {
      targetUserId: req.params.id,
      targetEmail: targetUser.email,
      from: targetUser.role,
      to: role,
    }, req.params.id);
  }

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

  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { email: true, role: true } });
  await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  if (target) {
    logSecurityEvent(req.user!.id, 'user.deactivated', {
      targetUserId: req.params.id,
      targetEmail: target.email,
      targetRole: target.role,
    }, req.params.id);
  }

  res.json({ ok: true });
}));

export default router;
