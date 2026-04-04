import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  type: z.enum(['My Action', 'Waiting On', 'Decision', 'Review', 'Recurring']),
  status: z.enum(['Not Started', 'In Progress', 'Waiting On', 'Blocked', 'Done', 'Cancelled']).default('Not Started'),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']).default('Medium'),
  source: z.enum(['Chat', 'Email', 'Manual', 'Recurring']).default('Manual'),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
  workstreamId: z.string().optional(),
  parentId: z.string().optional(),
  waitingOnWhom: z.string().optional(),
  recurringCron: z.string().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  type: z.enum(['My Action', 'Waiting On', 'Decision', 'Review', 'Recurring']).optional(),
  status: z.enum(['Not Started', 'In Progress', 'Waiting On', 'Blocked', 'Done', 'Cancelled']).optional(),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
  dueDate: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  workstreamId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  waitingOnWhom: z.string().nullable().optional(),
  recurringCron: z.string().nullable().optional(),
});

export const addNoteSchema = z.object({
  taskId: z.string(),
  content: z.string().min(1),
  type: z.enum(['Comment', 'Status Update', 'Blocker Report', 'System Log']).default('Comment'),
});

export const chatMessageSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().optional(),
});

export const taskFilterSchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  type: z.string().optional(),
  workstreamId: z.string().optional(),
  assigneeId: z.string().optional(),
  search: z.string().optional(),
  dueBefore: z.string().optional(),
  dueAfter: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(50),
  sortBy: z.enum(['dueDate', 'priority', 'createdAt', 'title', 'status']).default('dueDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type AddNoteInput = z.infer<typeof addNoteSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type TaskFilterInput = z.infer<typeof taskFilterSchema>;

export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(10),
  description: z.string().optional(),
  color: z.string().optional(),
  headId: z.string().nullable().optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(10).optional(),
  description: z.string().nullable().optional(),
  color: z.string().optional(),
  headId: z.string().nullable().optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
