import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { config } from '../config';
import { prisma } from '../prisma';
import { authenticate } from '../middleware/auth';
import { fetchM365User } from '../services/microsoft-graph';
import { resolveMappedDepartmentIds } from '../services/department-mapping';
import { logSecurityEvent } from './audit';
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

// POST /microsoft - Microsoft SSO (only login method)
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
    // Best-effort log of failed verification (no userId yet, so log under 'unknown')
    const ip = req.ip || req.socket?.remoteAddress || null;
    logSecurityEvent('unknown', 'auth.sso.verify_failed', { reason: err.message, ip });
    throw new AppError(401, `Microsoft token verification failed: ${err.message}`);
  }

  const email = verified.email || verified.preferred_username;
  if (!email) throw new AppError(401, 'No email in Microsoft token');
  const name = verified.name || email.split('@')[0];
  const microsoftId = verified.oid || verified.sub;

  // Determine if user is in the configured admin AD group
  const groups: string[] = Array.isArray(verified.groups) ? verified.groups : [];
  const isAdminFromGroup = !!(config.MS_ADMIN_GROUP_ID && groups.includes(config.MS_ADMIN_GROUP_ID));

  // Pull department + jobTitle from MS Graph (token doesn't include them)
  const profile = microsoftId ? await fetchM365User(microsoftId) : null;
  const mappedDeptIds = await resolveMappedDepartmentIds(profile?.department ?? null);
  const departmentId = mappedDeptIds[0] ?? null;
  const position = profile?.jobTitle ?? null;

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
        role: isAdminFromGroup ? 'SUPER_ADMIN' : 'STAFF',
        microsoftId,
        ...(departmentId ? { departmentId } : {}),
        ...(position ? { position } : {}),
      },
      include: { dept: { select: { id: true, name: true, code: true } } },
    });
  } else {
    // Sync microsoftId + role + department + position on every login
    const updates: Record<string, unknown> = {};
    if (!user.microsoftId && microsoftId) updates.microsoftId = microsoftId;

    if (isAdminFromGroup && user.role !== 'SUPER_ADMIN') {
      updates.role = 'SUPER_ADMIN';
    } else if (!isAdminFromGroup && user.role === 'SUPER_ADMIN') {
      updates.role = 'STAFF';
    }

    if (departmentId && user.departmentId !== departmentId) updates.departmentId = departmentId;
    if (position && user.position !== position) updates.position = position;

    if (Object.keys(updates).length > 0) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: updates,
        include: { dept: { select: { id: true, name: true, code: true } } },
      });
    }
  }

  // Sync UserAssignments to match the mapped departments from M365.
  // The first mapped dept is primary; the rest are additional memberships.
  if (mappedDeptIds.length > 0) {
    const existingAssignments = await prisma.userAssignment.findMany({
      where: { userId: user.id },
      select: { id: true, departmentId: true, isPrimary: true },
    });
    const existingMap = new Map(existingAssignments.map(a => [a.departmentId, a]));
    for (let i = 0; i < mappedDeptIds.length; i++) {
      const deptId = mappedDeptIds[i];
      const isPrimary = i === 0;
      const cur = existingMap.get(deptId);
      if (cur) {
        if (cur.isPrimary !== isPrimary) {
          await prisma.userAssignment.update({ where: { id: cur.id }, data: { isPrimary } });
        }
      } else {
        await prisma.userAssignment.create({
          data: { userId: user.id, departmentId: deptId, role: user.role, isPrimary },
        });
      }
    }
  }

  if (!user.isActive) {
    logSecurityEvent(user.id, 'auth.sso.blocked_inactive', { email: user.email });
    throw new AppError(401, 'Account disabled');
  }

  // Successful login
  logSecurityEvent(user.id, 'auth.sso.success', {
    email: user.email,
    ip: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null,
    isAdminFromGroup,
  });

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

export default router;
