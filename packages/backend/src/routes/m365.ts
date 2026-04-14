import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { AppError } from '../middleware/error';
import { authorize } from '../middleware/auth';
import { fetchM365Users } from '../services/microsoft-graph';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// GET / users — fetch M365 directory and annotate with GTMS status
router.get('/users', authorize('SUPER_ADMIN', 'ED'), asyncHandler(async (req: Request, res: Response) => {
  const m365Users = await fetchM365Users();

  // Batch-check existing GTMS users
  const emails = m365Users.map(u => (u.mail || u.userPrincipalName).toLowerCase());
  const microsoftIds = m365Users.map(u => u.id);

  const existingUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { in: emails } },
        { microsoftId: { in: microsoftIds } },
      ],
    },
    select: { id: true, email: true, microsoftId: true, name: true },
  });

  const emailMap = new Map(existingUsers.map(u => [u.email.toLowerCase(), u]));
  const msIdMap = new Map(
    existingUsers.filter(u => u.microsoftId).map(u => [u.microsoftId!, u])
  );

  const annotated = m365Users.map(u => {
    const email = (u.mail || u.userPrincipalName).toLowerCase();
    const linkedUser = msIdMap.get(u.id);
    const emailUser = emailMap.get(email);

    let status: 'linked' | 'exists_unlinked' | 'new';
    let gtmsUserId: string | null = null;

    if (linkedUser) {
      status = 'linked';
      gtmsUserId = linkedUser.id;
    } else if (emailUser) {
      status = 'exists_unlinked';
      gtmsUserId = emailUser.id;
    } else {
      status = 'new';
    }

    return {
      microsoftId: u.id,
      displayName: u.displayName,
      email,
      jobTitle: u.jobTitle,
      department: u.department,
      mobilePhone: u.mobilePhone,
      status,
      gtmsUserId,
    };
  });

  res.json(annotated);
}));

// POST /import — import selected M365 users into GTMS
router.post('/import', authorize('SUPER_ADMIN', 'ED'), asyncHandler(async (req: Request, res: Response) => {
  const { users } = req.body;
  if (!Array.isArray(users) || users.length === 0) {
    throw new AppError(400, 'users array is required');
  }
  if (users.length > 100) {
    throw new AppError(400, 'Maximum 100 users per import');
  }

  const results: Array<{
    email: string;
    displayName: string;
    action: 'created' | 'linked' | 'already_linked' | 'error';
    temporaryPassword?: string;
    gtmsUserId?: string;
    error?: string;
  }> = [];

  let created = 0;
  let linked = 0;
  let alreadyLinked = 0;
  let errors = 0;

  for (const u of users) {
    const { microsoftId, email, displayName, jobTitle, mobilePhone } = u;
    if (!microsoftId || !email || !displayName) {
      results.push({ email: email || '?', displayName: displayName || '?', action: 'error', error: 'Missing required fields' });
      errors++;
      continue;
    }

    try {
      // Check if microsoftId is already linked
      const byMsId = await prisma.user.findUnique({ where: { microsoftId } });
      if (byMsId) {
        results.push({ email, displayName, action: 'already_linked', gtmsUserId: byMsId.id });
        alreadyLinked++;
        continue;
      }

      // Check if email already exists
      const byEmail = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (byEmail) {
        // Link microsoftId to existing user
        await prisma.user.update({
          where: { id: byEmail.id },
          data: { microsoftId },
        });
        results.push({ email, displayName, action: 'linked', gtmsUserId: byEmail.id });
        linked++;
        continue;
      }

      // Create new user
      const tempPassword = crypto.randomBytes(8).toString('base64url').slice(0, 12);
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      const newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name: displayName,
          role: 'STAFF',
          position: jobTitle || '',
          phone: mobilePhone || '',
          microsoftId,
          passwordHash,
        },
      });

      results.push({ email, displayName, action: 'created', temporaryPassword: tempPassword, gtmsUserId: newUser.id });
      created++;
    } catch (err: any) {
      console.error(`M365 import error for ${email}:`, err);
      results.push({ email, displayName, action: 'error', error: err.message || 'Unknown error' });
      errors++;
    }
  }

  res.json({ summary: { created, linked, alreadyLinked, errors, total: users.length }, results });
}));

export default router;
