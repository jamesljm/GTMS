import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AppError } from '../middleware/error';

const router = Router({ mergeParams: true });

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

function canManageMembers(role: string): boolean {
  return ['SUPER_ADMIN', 'ED', 'HOD', 'MANAGER'].includes(role);
}

// GET /workstreams/:id/members
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const workstreamId = req.params.id;

  const members = await prisma.workstreamMember.findMany({
    where: { workstreamId },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, position: true, departmentId: true, dept: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json(members);
}));

// POST /workstreams/:id/members — add member
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  if (!canManageMembers(req.user!.role)) {
    throw new AppError(403, 'Only HOD, MANAGER, ED or SUPER_ADMIN can manage workstream members');
  }

  const workstreamId = req.params.id;
  const { userId, role } = req.body;

  if (!userId) throw new AppError(400, 'userId is required');
  if (role && !['HOD', 'MANAGER', 'STAFF'].includes(role)) {
    throw new AppError(400, 'role must be HOD, MANAGER, or STAFF');
  }

  // Check workstream exists
  const ws = await prisma.workstream.findUnique({ where: { id: workstreamId } });
  if (!ws) throw new AppError(404, 'Workstream not found');

  // Check user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');

  const member = await prisma.workstreamMember.upsert({
    where: { userId_workstreamId: { userId, workstreamId } },
    create: { userId, workstreamId, role: role || 'STAFF' },
    update: { role: role || 'STAFF' },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, position: true },
      },
    },
  });

  res.status(201).json(member);
}));

// PATCH /workstreams/:wsId/members/:userId — update role
router.patch('/:userId', asyncHandler(async (req: Request, res: Response) => {
  if (!canManageMembers(req.user!.role)) {
    throw new AppError(403, 'Only HOD, MANAGER, ED or SUPER_ADMIN can manage workstream members');
  }

  const workstreamId = req.params.id;
  const userId = req.params.userId;
  const { role } = req.body;

  if (!role || !['HOD', 'MANAGER', 'STAFF'].includes(role)) {
    throw new AppError(400, 'role must be HOD, MANAGER, or STAFF');
  }

  const member = await prisma.workstreamMember.update({
    where: { userId_workstreamId: { userId, workstreamId } },
    data: { role },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, position: true },
      },
    },
  });

  res.json(member);
}));

// DELETE /workstreams/:wsId/members/:userId — remove member
router.delete('/:userId', asyncHandler(async (req: Request, res: Response) => {
  if (!canManageMembers(req.user!.role)) {
    throw new AppError(403, 'Only HOD, MANAGER, ED or SUPER_ADMIN can manage workstream members');
  }

  const workstreamId = req.params.id;
  const userId = req.params.userId;

  await prisma.workstreamMember.delete({
    where: { userId_workstreamId: { userId, workstreamId } },
  });

  res.json({ ok: true });
}));

export default router;
