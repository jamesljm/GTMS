import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AppError } from '../middleware/error';
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
      department: true,
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
      department: true,
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
  const { email, name, role, position, department, password } = req.body;
  if (!email || !name) {
    res.status(400).json({ error: 'email and name are required' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(400).json({ error: 'Email already in use' });
    return;
  }

  const passwordHash = await bcrypt.hash(password || 'Admin1234', 12);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      role: role || 'STAFF',
      position: position || '',
      department: department || '',
      passwordHash,
    },
    select: { id: true, name: true, email: true, role: true, position: true, department: true },
  });

  res.status(201).json(user);
}));

// PATCH /:id - update user
router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { name, email, role, position, department } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(role !== undefined && { role }),
      ...(position !== undefined && { position }),
      ...(department !== undefined && { department }),
    },
    select: { id: true, name: true, email: true, role: true, position: true, department: true },
  });

  res.json(user);
}));

// DELETE /:id - deactivate user (soft delete)
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  res.json({ ok: true });
}));

export default router;
