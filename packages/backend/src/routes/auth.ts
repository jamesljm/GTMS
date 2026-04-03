import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginSchema, changePasswordSchema } from 'shared';
import { AppError } from '../middleware/error';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

function generateTokens(user: { id: string; email: string; name: string; role: string }) {
  const payload = { id: user.id, email: user.email, name: user.name, role: user.role };
  const accessToken = jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN as any });
  const refreshToken = jwt.sign({ id: user.id }, config.JWT_REFRESH_SECRET, { expiresIn: config.JWT_REFRESH_EXPIRES_IN as any });
  return { accessToken, refreshToken };
}

// POST /login - email + password
router.post('/login', validate(loginSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw new AppError(401, 'Invalid credentials');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError(401, 'Invalid credentials');

  const tokens = generateTokens(user);

  res.json({
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      position: user.position,
      department: user.department,
    },
  });
}));

// POST /microsoft - Microsoft SSO
router.post('/microsoft', asyncHandler(async (req: Request, res: Response) => {
  const { idToken } = req.body;
  if (!idToken) throw new AppError(400, 'ID token required');

  // In production, validate the ID token with MSAL
  // For now, decode without verification for development
  let decoded: any;
  try {
    decoded = jwt.decode(idToken);
    if (!decoded?.email && !decoded?.preferred_username) {
      throw new Error('No email in token');
    }
  } catch {
    throw new AppError(401, 'Invalid Microsoft ID token');
  }

  const email = decoded.email || decoded.preferred_username;
  const name = decoded.name || email.split('@')[0];

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Auto-create user from SSO
    const passwordHash = await bcrypt.hash(Math.random().toString(36), 12);
    user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: 'STAFF',
        microsoftId: decoded.oid || decoded.sub,
      },
    });
  } else if (!user.microsoftId && decoded.oid) {
    await prisma.user.update({
      where: { id: user.id },
      data: { microsoftId: decoded.oid },
    });
  }

  if (!user.isActive) throw new AppError(401, 'Account disabled');

  const tokens = generateTokens(user);

  res.json({
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      position: user.position,
      department: user.department,
    },
  });
}));

// POST /refresh
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError(400, 'Refresh token required');

  try {
    const payload = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as { id: string };
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.isActive) throw new AppError(401, 'Invalid refresh token');

    const tokens = generateTokens(user);
    res.json(tokens);
  } catch {
    throw new AppError(401, 'Invalid refresh token');
  }
}));

// GET /me
router.get('/me', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw new AppError(404, 'User not found');

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    position: user.position,
    department: user.department,
  });
}));

// POST /change-password
router.post('/change-password', authenticate, validate(changePasswordSchema), asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw new AppError(404, 'User not found');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError(400, 'Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  res.json({ message: 'Password changed successfully' });
}));

export default router;
