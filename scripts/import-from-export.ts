// Imports MS-linked users, workstreams, workstream members, and department heads
// from gtms-db-export.json into the current database.
//
// Strategy:
// - Skips users without a microsoftId (only 1 such user, the personal hotmail account)
// - For each user: upsert by microsoftId (preferred) or email
// - For workstreams: upsert by id
// - For workstream members: create if not exists
// - For department heads: set headId on each Department
//
// IDs from the export are preserved when creating new records, so workstream
// members can reference the same userIds across the imports.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';

const prisma = new PrismaClient();

interface ExportUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  position: string | null;
  phone: string | null;
  isActive: boolean;
  microsoftId: string | null;
  createdAt: string;
  updatedAt: string;
  departmentId: string | null;
}

interface ExportWorkstream {
  id: string;
  code: string;
  name: string;
  description: string | null;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  departmentId: string | null;
}

interface ExportWsMember {
  id: string;
  userId: string;
  workstreamId: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface ExportDept {
  id: string;
  name: string;
  headId: string | null;
}

async function main() {
  const filePath = process.argv[2] || '/tmp/gtms-db-export.json';
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const users: ExportUser[] = data.users || [];
  const workstreams: ExportWorkstream[] = data.workstreams || [];
  const wsMembers: ExportWsMember[] = data.workstreamMembers || [];
  const departments: ExportDept[] = data.departments || [];

  // Map exportUserId → actual DB user id (in case we matched an existing user by email)
  const userIdMap = new Map<string, string>();

  // ----- 1. Users -----
  console.log('Importing users (MS-linked only)...');
  let userCreated = 0, userMatched = 0, userSkipped = 0;
  for (const u of users) {
    if (!u.microsoftId) {
      userSkipped++;
      continue; // skip non-MS users
    }
    // Match by microsoftId first
    let existing = await prisma.user.findFirst({ where: { microsoftId: u.microsoftId } });
    if (!existing) {
      // Then by email
      existing = await prisma.user.findUnique({ where: { email: u.email } });
    }
    if (existing) {
      // Update with export's data, but only fill empty fields (preserve any DB-side updates)
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          microsoftId: existing.microsoftId || u.microsoftId,
          name: u.name,
          position: existing.position || u.position,
          phone: existing.phone || u.phone,
          // Don't overwrite role - it may have been set by the AD group sync (SUPER_ADMIN)
        },
      });
      userIdMap.set(u.id, existing.id);
      userMatched++;
    } else {
      // Create new with export's ID preserved
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('base64'), 12);
      await prisma.user.create({
        data: {
          id: u.id,
          email: u.email,
          name: u.name,
          passwordHash,
          role: u.role,
          position: u.position,
          phone: u.phone,
          isActive: u.isActive,
          microsoftId: u.microsoftId,
          // departmentId: skip — let M365 SSO sync set this on first login
        },
      });
      userIdMap.set(u.id, u.id);
      userCreated++;
    }
  }
  console.log(`  Users: ${userCreated} created, ${userMatched} matched/updated, ${userSkipped} skipped`);

  // ----- 2. Workstreams -----
  console.log('Importing workstreams...');
  let wsCreated = 0, wsMatched = 0;
  for (const w of workstreams) {
    const existing = await prisma.workstream.findUnique({ where: { id: w.id } });
    if (existing) {
      wsMatched++;
      continue;
    }
    // Verify department exists (we imported departments earlier, so should be fine)
    let deptId = w.departmentId;
    if (deptId) {
      const dept = await prisma.department.findUnique({ where: { id: deptId } });
      if (!dept) deptId = null;
    }
    // Check for code conflict
    const codeConflict = await prisma.workstream.findUnique({ where: { code: w.code } });
    if (codeConflict) {
      console.log(`  Skipping ${w.code}: code already exists with different id`);
      continue;
    }
    await prisma.workstream.create({
      data: {
        id: w.id,
        code: w.code,
        name: w.name,
        description: w.description,
        color: w.color,
        sortOrder: w.sortOrder,
        departmentId: deptId,
      },
    });
    wsCreated++;
  }
  console.log(`  Workstreams: ${wsCreated} created, ${wsMatched} already existed`);

  // ----- 3. Workstream members -----
  console.log('Importing workstream members...');
  let memCreated = 0, memSkipped = 0;
  for (const m of wsMembers) {
    const userId = userIdMap.get(m.userId);
    if (!userId) {
      memSkipped++;
      continue;
    }
    const ws = await prisma.workstream.findUnique({ where: { id: m.workstreamId } });
    if (!ws) {
      memSkipped++;
      continue;
    }
    const existing = await prisma.workstreamMember.findFirst({
      where: { userId, workstreamId: m.workstreamId },
    });
    if (existing) {
      memSkipped++;
      continue;
    }
    await prisma.workstreamMember.create({
      data: { userId, workstreamId: m.workstreamId, role: m.role },
    });
    memCreated++;
  }
  console.log(`  Workstream members: ${memCreated} created, ${memSkipped} skipped`);

  // ----- 4. Department heads -----
  console.log('Setting department heads...');
  let headSet = 0, headSkipped = 0;
  for (const d of departments) {
    if (!d.headId) continue;
    const headDbId = userIdMap.get(d.headId);
    if (!headDbId) {
      headSkipped++;
      continue;
    }
    const dept = await prisma.department.findUnique({ where: { id: d.id } });
    if (!dept) {
      headSkipped++;
      continue;
    }
    // Make sure the head isn't already the head of another department (unique constraint)
    if (dept.headId === headDbId) continue;
    // Clear any existing head of this user (since headId is unique)
    await prisma.department.updateMany({
      where: { headId: headDbId, id: { not: dept.id } },
      data: { headId: null },
    });
    await prisma.department.update({
      where: { id: dept.id },
      data: { headId: headDbId },
    });
    headSet++;
  }
  console.log(`  Department heads: ${headSet} set, ${headSkipped} skipped`);

  console.log('\nDone.');
}

main()
  .catch((e) => { console.error('Import failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
