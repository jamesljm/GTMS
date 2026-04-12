import { prisma } from '../prisma';
import { AuthUser } from './auth';

export async function getVisibleTaskFilter(user: AuthUser): Promise<any> {
  if (user.role === 'SUPER_ADMIN' || user.role === 'ED') return {};

  if (user.role === 'HOD' || user.role === 'MANAGER') {
    if (!user.departmentId) {
      return { OR: [{ assigneeId: user.id }, { createdById: user.id }] };
    }
    const deptUsers = await prisma.user.findMany({
      where: { departmentId: user.departmentId, isActive: true },
      select: { id: true },
    });
    const memberIds = deptUsers.map(u => u.id);
    return {
      OR: [
        { assigneeId: { in: memberIds } },
        { createdById: user.id },
      ],
    };
  }

  // STAFF
  return {
    OR: [
      { assigneeId: user.id },
      { createdById: user.id },
    ],
  };
}

export async function canEditTask(user: AuthUser, task: { assigneeId: string | null; createdById: string }): Promise<boolean> {
  if (user.role === 'SUPER_ADMIN' || user.role === 'ED') return true;
  if (task.createdById === user.id || task.assigneeId === user.id) return true;

  if ((user.role === 'HOD' || user.role === 'MANAGER') && task.assigneeId && user.departmentId) {
    const assignee = await prisma.user.findUnique({
      where: { id: task.assigneeId },
      select: { departmentId: true },
    });
    return assignee?.departmentId === user.departmentId;
  }

  return false;
}

export function canManageUsers(user: AuthUser): boolean {
  return user.role === 'SUPER_ADMIN' || user.role === 'ED' || user.role === 'HOD';
}
