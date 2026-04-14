import { prisma } from '../prisma';
import { AuthUser } from './auth';

/**
 * Get user's workstream memberships (cached per-request via caller).
 */
export async function getUserWorkstreamMemberships(userId: string) {
  return prisma.workstreamMember.findMany({
    where: { userId },
    select: { workstreamId: true, role: true },
  });
}

/**
 * Get user's role in a specific workstream, or null if not a member.
 */
export async function getWorkstreamRole(userId: string, workstreamId: string): Promise<string | null> {
  const membership = await prisma.workstreamMember.findUnique({
    where: { userId_workstreamId: { userId, workstreamId } },
    select: { role: true },
  });
  return membership?.role || null;
}

/**
 * Workstream-based task visibility filter.
 * Users see:
 * - Tasks in workstreams they are members of
 * - Tasks assigned to them (any workstream or none)
 * - Tasks they created (any workstream or none)
 * - Tasks with no workstream if they are creator or assignee
 */
export async function getVisibleTaskFilter(user: AuthUser): Promise<any> {
  const memberships = await getUserWorkstreamMemberships(user.id);
  const memberWorkstreamIds = memberships.map(m => m.workstreamId);

  return {
    OR: [
      // Tasks in workstreams user belongs to
      ...(memberWorkstreamIds.length > 0 ? [{ workstreamId: { in: memberWorkstreamIds } }] : []),
      // Tasks assigned to user (any workstream)
      { assigneeId: user.id },
      // Tasks created by user (any workstream)
      { createdById: user.id },
    ],
  };
}

/**
 * Workstream-based task edit permission.
 * - Creator or assignee: can always edit
 * - Workstream HOD/MANAGER: full edit
 * - Workstream STAFF: status only (handled by caller)
 * - Not a member: no edit
 */
export async function canEditTask(
  user: AuthUser,
  task: { assigneeId: string | null; createdById: string; workstreamId: string | null },
): Promise<boolean> {
  // Creator or assignee can always edit
  if (task.createdById === user.id || task.assigneeId === user.id) return true;

  // Check workstream membership
  if (task.workstreamId) {
    const wsRole = await getWorkstreamRole(user.id, task.workstreamId);
    if (wsRole === 'HOD' || wsRole === 'MANAGER') return true;
    if (wsRole === 'STAFF') return true; // STAFF can edit (status only — enforced by caller)
  }

  return false;
}

/**
 * Check if user has full edit (non-status-only) access to a task.
 * Returns true for creator, assignee, or workstream HOD/MANAGER.
 * Returns false for workstream STAFF (status only) or non-members.
 */
export async function canEditAllTaskFields(
  user: AuthUser,
  task: { assigneeId: string | null; createdById: string; workstreamId: string | null },
): Promise<boolean> {
  // Creator or assignee always get full edit
  if (task.createdById === user.id || task.assigneeId === user.id) return true;

  // Check workstream role
  if (task.workstreamId) {
    const wsRole = await getWorkstreamRole(user.id, task.workstreamId);
    if (wsRole === 'HOD' || wsRole === 'MANAGER') return true;
  }

  return false;
}

export function canManageUsers(user: AuthUser): boolean {
  return user.role === 'SUPER_ADMIN' || user.role === 'ED' || user.role === 'HOD';
}
