interface User {
  id: string;
  role: string;
  departmentId?: string;
}

export function canManageUsers(user: User): boolean {
  return user.role === 'SUPER_ADMIN' || user.role === 'ED' || user.role === 'HOD';
}

export function canManageDepartments(user: User): boolean {
  return user.role === 'SUPER_ADMIN' || user.role === 'ED';
}

export function canManageWorkstreams(user: User): boolean {
  return user.role === 'SUPER_ADMIN' || user.role === 'ED';
}

export function canEditAllFields(user: User): boolean {
  return user.role !== 'STAFF';
}

export function canDeleteTask(user: User, task: { createdById?: string }): boolean {
  return user.role === 'SUPER_ADMIN' || user.role === 'ED' || task.createdById === user.id;
}

export function isSuperAdminOrED(user: User): boolean {
  return user.role === 'SUPER_ADMIN' || user.role === 'ED';
}
