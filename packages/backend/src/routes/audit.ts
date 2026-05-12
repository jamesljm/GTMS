import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// Helper to create audit log entries (called from task routes)
export async function createAuditLog(
  userId: string,
  action: string,
  entityId?: string,
  details?: Record<string, any>,
  entity: string = 'Task',
) {
  return prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      details: details ? JSON.stringify(details) : null,
    },
  });
}

// Convenience wrapper for security/auth events. Failures are swallowed so audit logging
// can never block the user-facing flow.
export function logSecurityEvent(
  userId: string,
  action: string,
  details?: Record<string, any>,
  entityId?: string,
) {
  return prisma.auditLog
    .create({
      data: {
        userId,
        action,
        entity: 'Security',
        entityId,
        details: details ? JSON.stringify(details) : null,
      },
    })
    .catch((err) => console.error('Security audit log failed:', err.message));
}

// GET / - admin: all audit logs
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  const where: any = {};

  // Only ED can see all logs; others get their own
  if (req.user!.role !== 'ED') {
    where.userId = req.user!.id;
  }

  if (req.query.action) where.action = req.query.action;
  if (req.query.userId && (req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ED')) where.userId = req.query.userId;
  if (req.query.dateFrom || req.query.dateTo) {
    where.createdAt = {};
    if (req.query.dateFrom) where.createdAt.gte = new Date(req.query.dateFrom as string);
    if (req.query.dateTo) where.createdAt.lte = new Date(req.query.dateTo as string);
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

// GET /mine - personal audit logs
router.get('/mine', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  const where: any = { userId: req.user!.id };
  if (req.query.action) where.action = req.query.action;
  if (req.query.dateFrom || req.query.dateTo) {
    where.createdAt = {};
    if (req.query.dateFrom) where.createdAt.gte = new Date(req.query.dateFrom as string);
    if (req.query.dateTo) where.createdAt.lte = new Date(req.query.dateTo as string);
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

export default router;
