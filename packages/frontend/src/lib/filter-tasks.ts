/**
 * Client-side task filtering for pages that fetch tasks from specialized endpoints.
 * Matches the same filter keys used by FilterBar and the backend API.
 */

function parseMulti(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return String(val).split(",").filter(Boolean);
}

export function filterTasks(tasks: any[], filters: Record<string, any>, search: string): any[] {
  if (!tasks) return [];

  const statusFilter = parseMulti(filters.status);
  const priorityFilter = parseMulti(filters.priority);
  const wsFilter = parseMulti(filters.workstreamId);
  const assigneeFilter = parseMulti(filters.assigneeId);
  const initiatorFilter = parseMulti(filters.createdById);
  const acceptFilter = parseMulti(filters.acceptanceStatus);
  const searchLower = search?.toLowerCase() || "";

  return tasks.filter((task: any) => {
    if (statusFilter.length > 0 && !statusFilter.includes(task.status)) return false;
    if (priorityFilter.length > 0 && !priorityFilter.includes(task.priority)) return false;
    if (wsFilter.length > 0 && !wsFilter.includes(task.workstreamId)) return false;
    if (assigneeFilter.length > 0 && !assigneeFilter.includes(task.assigneeId)) return false;
    if (initiatorFilter.length > 0 && !initiatorFilter.includes(task.createdById)) return false;
    if (acceptFilter.length > 0) {
      const taskAcceptance = task.acceptanceStatus || "Accepted";
      if (!acceptFilter.includes(taskAcceptance)) return false;
    }
    if (searchLower) {
      if (!task.title?.toLowerCase().includes(searchLower) && !task.description?.toLowerCase().includes(searchLower)) return false;
    }
    return true;
  });
}
