// Imports departments only from gtms-db-export.json
// - Wipes current Department + UserAssignment records
// - Nullifies User.departmentId and Workstream.departmentId references
// - Inserts the export's departments (without headId, since the referenced users may not exist locally)

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const filePath = process.argv[2] || '/tmp/gtms-db-export.json';
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!Array.isArray(data.departments)) {
    throw new Error('Export does not contain a departments array');
  }
  console.log(`Found ${data.departments.length} departments in export.`);

  console.log('Nullifying department references on users and workstreams...');
  await prisma.user.updateMany({ data: { departmentId: null } });
  await prisma.workstream.updateMany({ data: { departmentId: null } });

  console.log('Deleting current user assignments...');
  const delAssign = await prisma.userAssignment.deleteMany();
  console.log(`  ${delAssign.count} user assignments deleted`);

  console.log('Deleting current departments...');
  const delDept = await prisma.department.deleteMany();
  console.log(`  ${delDept.count} departments deleted`);

  console.log('Importing departments...');
  let created = 0;
  for (const d of data.departments) {
    await prisma.department.create({
      data: {
        id: d.id,
        name: d.name,
        code: d.code,
        description: d.description ?? null,
        color: d.color || '#6366f1',
        sortOrder: d.sortOrder ?? 0,
        createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
        updatedAt: d.updatedAt ? new Date(d.updatedAt) : new Date(),
        // headId intentionally left null — will be set when admin assigns HOD via UI
      },
    });
    created++;
  }
  console.log(`Imported ${created} departments.`);
  console.log('Done.');
}

main()
  .catch((e) => { console.error('Import failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
