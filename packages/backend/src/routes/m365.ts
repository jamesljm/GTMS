import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { config } from '../config';
import { AppError } from '../middleware/error';
import { authorize } from '../middleware/auth';
import { fetchM365Users, fetchM365LicenseMap } from '../services/microsoft-graph';
import { findOrCreateDepartmentByName } from '../services/department-sync';
import { mapM365DepartmentNames, resolveMappedDepartmentIds } from '../services/department-mapping';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

function getAllowedSkuParts(): Set<string> {
  return new Set(
    config.M365_ALLOWED_SKU_PARTS.split(',').map(s => s.trim()).filter(Boolean)
  );
}

// Filters M365 users to those holding at least one license whose skuPartNumber is in the allowed set.
function filterByLicense(users: Array<any>, skuMap: Map<string, string>, allowed: Set<string>) {
  if (allowed.size === 0) return users;
  return users.filter(u => {
    const licenses = u.assignedLicenses || [];
    return licenses.some((l: { skuId: string }) => {
      const partNumber = skuMap.get(l.skuId);
      return partNumber && allowed.has(partNumber);
    });
  });
}

// GET /users — fetch licensed M365 users and annotate with GTMS status + suggested department mapping
router.get('/users', authorize('SUPER_ADMIN', 'ED'), asyncHandler(async (req: Request, res: Response) => {
  const allowed = getAllowedSkuParts();
  const [allUsers, skuMap] = await Promise.all([
    fetchM365Users(),
    fetchM365LicenseMap(),
  ]);
  const m365Users = filterByLicense(allUsers, skuMap, allowed);

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
      mappedDepartments: mapM365DepartmentNames(u.department),
      mobilePhone: u.mobilePhone,
      status,
      gtmsUserId,
    };
  });

  res.json(annotated);
}));

// POST /import — import selected M365 users into GTMS, applying department mapping
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

  // Sync mapped department assignments (multi-dept) for a given user, marking the first as primary.
  async function syncAssignments(userId: string, departmentIds: string[]) {
    if (departmentIds.length === 0) return;
    const existing = await prisma.userAssignment.findMany({
      where: { userId },
      select: { id: true, departmentId: true, isPrimary: true },
    });
    const existingMap = new Map(existing.map(a => [a.departmentId, a]));

    for (let i = 0; i < departmentIds.length; i++) {
      const deptId = departmentIds[i];
      const isPrimary = i === 0;
      const cur = existingMap.get(deptId);
      if (cur) {
        if (cur.isPrimary !== isPrimary) {
          await prisma.userAssignment.update({ where: { id: cur.id }, data: { isPrimary } });
        }
      } else {
        await prisma.userAssignment.create({
          data: { userId, departmentId: deptId, role: 'STAFF', isPrimary },
        });
      }
    }
    // Demote any other primary assignments not in our mapped set
    if (departmentIds.length > 0) {
      await prisma.userAssignment.updateMany({
        where: { userId, departmentId: { notIn: departmentIds }, isPrimary: true },
        data: { isPrimary: false },
      });
    }
  }

  for (const u of users) {
    const { microsoftId, email, displayName, jobTitle, mobilePhone, department } = u;
    if (!microsoftId || !email || !displayName) {
      results.push({ email: email || '?', displayName: displayName || '?', action: 'error', error: 'Missing required fields' });
      errors++;
      continue;
    }

    try {
      const mappedIds = await resolveMappedDepartmentIds(department);
      const primaryDeptId = mappedIds[0] ?? null;

      // Check if microsoftId is already linked
      const byMsId = await prisma.user.findUnique({ where: { microsoftId } });
      if (byMsId) {
        await prisma.user.update({
          where: { id: byMsId.id },
          data: {
            ...(primaryDeptId && byMsId.departmentId !== primaryDeptId ? { departmentId: primaryDeptId } : {}),
            ...(jobTitle ? { position: jobTitle } : {}),
          },
        });
        await syncAssignments(byMsId.id, mappedIds);
        results.push({ email, displayName, action: 'already_linked', gtmsUserId: byMsId.id });
        alreadyLinked++;
        continue;
      }

      // Check if email already exists
      const byEmail = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (byEmail) {
        await prisma.user.update({
          where: { id: byEmail.id },
          data: {
            microsoftId,
            ...(primaryDeptId ? { departmentId: primaryDeptId } : {}),
            ...(jobTitle ? { position: jobTitle } : {}),
          },
        });
        await syncAssignments(byEmail.id, mappedIds);
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
          departmentId: primaryDeptId,
        },
      });
      await syncAssignments(newUser.id, mappedIds);

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

// POST /sync-departments — pull all unique departments from M365 and create missing ones in GTMS
router.post('/sync-departments', authorize('SUPER_ADMIN', 'ED'), asyncHandler(async (_req: Request, res: Response) => {
  const m365Users = await fetchM365Users();
  const uniqueNames = Array.from(
    new Set(
      m365Users
        .map(u => u.department?.trim())
        .filter((d): d is string => !!d)
    )
  ).sort();

  let createdCount = 0;
  let existingCount = 0;
  const created: string[] = [];

  for (const name of uniqueNames) {
    const result = await findOrCreateDepartmentByName(name);
    if (!result) continue;
    if (result.created) {
      createdCount++;
      created.push(name);
    } else {
      existingCount++;
    }
  }

  res.json({
    summary: { totalFromM365: uniqueNames.length, created: createdCount, alreadyExisting: existingCount },
    createdNames: created,
  });
}));

export default router;
