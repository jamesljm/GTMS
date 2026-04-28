import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { config } from '../config';
import { prisma } from '../prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginSchema, signupSchema, changePasswordSchema, resetPasswordSchema } from 'shared';
import crypto from 'crypto';
import { AppError } from '../middleware/error';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// JWKS client for Microsoft Entra ID token verification
const jwksClient = config.MS_TENANT_ID
  ? jwksRsa({
      jwksUri: `https://login.microsoftonline.com/${config.MS_TENANT_ID}/discovery/v2.0/keys`,
      cache: true,
      rateLimit: true,
    })
  : null;

function getSigningKey(kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!jwksClient) return reject(new Error('JWKS client not configured'));
    jwksClient.getSigningKey(kid, (err, key) => {
      if (err) return reject(err);
      resolve(key!.getPublicKey());
    });
  });
}

function generateTokens(user: { id: string; email: string; name: string; role: string; departmentId: string | null }) {
  const payload = { id: user.id, email: user.email, name: user.name, role: user.role, departmentId: user.departmentId };
  const accessToken = jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN as any });
  const refreshToken = jwt.sign({ id: user.id }, config.JWT_REFRESH_SECRET, { expiresIn: config.JWT_REFRESH_EXPIRES_IN as any });
  return { accessToken, refreshToken };
}

// POST /signup
router.post('/signup', validate(signupSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, name, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError(409, 'Email already in use');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, role: 'STAFF' },
    include: { dept: { select: { id: true, name: true, code: true } } },
  });

  const tokens = generateTokens(user);

  res.status(201).json({
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      position: user.position,
      departmentId: user.departmentId,
      department: user.dept,
      microsoftId: user.microsoftId,
    },
  });
}));

// POST /login - email + password
router.post('/login', validate(loginSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email }, include: { dept: { select: { id: true, name: true, code: true } } } });
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
      departmentId: user.departmentId,
      department: user.dept,
      microsoftId: user.microsoftId,
    },
  });
}));

// POST /microsoft - Microsoft SSO
router.post('/microsoft', asyncHandler(async (req: Request, res: Response) => {
  const { idToken } = req.body;
  if (!idToken) throw new AppError(400, 'ID token required');
  if (!config.MS_CLIENT_ID || !config.MS_TENANT_ID) {
    throw new AppError(503, 'Microsoft SSO is not configured');
  }

  // Decode header to get signing key ID
  const header = jwt.decode(idToken, { complete: true })?.header;
  if (!header?.kid) throw new AppError(401, 'Invalid Microsoft ID token');

  // Verify token signature via JWKS
  let verified: any;
  try {
    const signingKey = await getSigningKey(header.kid);
    verified = jwt.verify(idToken, signingKey, {
      algorithms: ['RS256'],
      audience: config.MS_CLIENT_ID,
      issuer: [
        `https://login.microsoftonline.com/${config.MS_TENANT_ID}/v2.0`,
        `https://sts.windows.net/${config.MS_TENANT_ID}/`,
      ],
    });
  } catch (err: any) {
    throw new AppError(401, `Microsoft token verification failed: ${err.message}`);
  }

  const email = verified.email || verified.preferred_username;
  if (!email) throw new AppError(401, 'No email in Microsoft token');
  const name = verified.name || email.split('@')[0];
  const microsoftId = verified.oid || verified.sub;

  // Find by microsoftId first, then by email
  let user = await prisma.user.findFirst({
    where: { OR: [{ microsoftId }, { email }] },
    include: { dept: { select: { id: true, name: true, code: true } } },
  });

  if (!user) {
    // Auto-create user from SSO
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('base64'), 12);
    user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: 'STAFF',
        microsoftId,
      },
      include: { dept: { select: { id: true, name: true, code: true } } },
    });
  } else if (!user.microsoftId && microsoftId) {
    // Link microsoftId to existing user found by email
    await prisma.user.update({
      where: { id: user.id },
      data: { microsoftId },
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
      departmentId: user.departmentId,
      department: (user as any).dept,
      microsoftId: user.microsoftId,
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
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { dept: { select: { id: true, name: true, code: true } } } });
  if (!user) throw new AppError(404, 'User not found');

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    position: user.position,
    departmentId: user.departmentId,
    department: user.dept,
    microsoftId: user.microsoftId,
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

// POST /reset-password (SUPER_ADMIN only)
router.post('/reset-password', authenticate, validate(resetPasswordSchema), asyncHandler(async (req: Request, res: Response) => {
  if (req.user!.role !== 'SUPER_ADMIN') {
    throw new AppError(403, 'Only SUPER_ADMIN can reset passwords');
  }

  const { userId, newPassword } = req.body;
  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) throw new AppError(404, 'User not found');

  const generatedPassword = newPassword || crypto.randomBytes(8).toString('base64url').slice(0, 12);
  const passwordHash = await bcrypt.hash(generatedPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  res.json({
    message: 'Password reset successfully',
    ...(newPassword ? {} : { temporaryPassword: generatedPassword }),
  });
}));

export default router;
