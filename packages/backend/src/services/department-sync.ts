import { prisma } from '../prisma';

// Generate a unique 3-5 char uppercase code from a department name.
// Example: "Finance & Accounts" -> "FIN", "Investor Relations" -> "IR" (then "INV" if "IR" taken)
async function generateUniqueCode(name: string): Promise<string> {
  const cleaned = name.toUpperCase().replace(/[^A-Z]/g, '');
  if (!cleaned) return await fallbackCode();

  // Try first 3 letters, then 4, then 5
  for (let len = 3; len <= 5; len++) {
    const candidate = cleaned.slice(0, len);
    if (!candidate) continue;
    const exists = await prisma.department.findUnique({ where: { code: candidate } });
    if (!exists) return candidate;
  }

  // Try acronym from word initials (e.g. "Investor Relations" -> "IR")
  const words = name.toUpperCase().split(/\s+/).filter(w => /^[A-Z]/.test(w));
  if (words.length >= 2) {
    const acronym = words.map(w => w[0]).join('').slice(0, 5);
    const exists = await prisma.department.findUnique({ where: { code: acronym } });
    if (!exists) return acronym;
  }

  return await fallbackCode();
}

async function fallbackCode(): Promise<string> {
  // Last resort: D001, D002, ...
  for (let i = 1; i < 1000; i++) {
    const c = `D${String(i).padStart(3, '0')}`;
    const exists = await prisma.department.findUnique({ where: { code: c } });
    if (!exists) return c;
  }
  throw new Error('Cannot generate unique department code');
}

// Find a department by case-insensitive name match, or create it if missing.
// Returns null only when the input name is empty.
export async function findOrCreateDepartmentByName(name: string | null | undefined): Promise<{ id: string; created: boolean } | null> {
  if (!name || !name.trim()) return null;
  const trimmed = name.trim();

  // Case-insensitive lookup
  const existing = await prisma.department.findFirst({
    where: { name: { equals: trimmed, mode: 'insensitive' } },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  const code = await generateUniqueCode(trimmed);
  const created = await prisma.department.create({
    data: { name: trimmed, code },
    select: { id: true },
  });
  return { id: created.id, created: true };
}
