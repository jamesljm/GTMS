// Maps M365 department strings to GTMS Department names.
// Returns an array because some M365 departments map to multiple GTMS departments
// (e.g., "Commercial & Contracts" → both Commercial AND Contracts).

import { findOrCreateDepartmentByName } from './department-sync';

const EXACT_MAP: Record<string, string[]> = {
  'ADMIN & IT': ['Admin'],
  'FINANCE': ['Finance'],
  'COMMERCIAL & CONTRACTS': ['Commercial', 'Contracts'],
  'TOP MANAGEMENT & MANAGERS': ['Management'],
  'HR': ['HR'],
  'PURCHASING': ['Purchasing'],
  'DESIGN': ['Design'],
  'GESB - PURCHASING': ['GESB Purchasing'],
  'ESH': ['Safety'],
  'EQUIPMENTS': ['Store & Warehouse'],
};

export function mapM365DepartmentNames(m365Dept: string | null | undefined): string[] {
  if (!m365Dept) return [];
  const u = m365Dept.toUpperCase().trim();

  // Partial match: anything containing OPERATIONS goes to Operations
  if (u.includes('OPERATIONS')) return ['Operations'];

  return EXACT_MAP[u] || [];
}

// Resolve mapped names to GTMS Department IDs (creating if missing).
// First ID in the array becomes the primary department.
export async function resolveMappedDepartmentIds(m365Dept: string | null | undefined): Promise<string[]> {
  const names = mapM365DepartmentNames(m365Dept);
  const ids: string[] = [];
  for (const name of names) {
    const result = await findOrCreateDepartmentByName(name);
    if (result) ids.push(result.id);
  }
  return ids;
}
