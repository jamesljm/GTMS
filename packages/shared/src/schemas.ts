import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
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
  recurrenceType: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']).optional(),
  recurrenceInterval: z.number().int().min(1).optional(),
  recurrenceDays: z.string().optional(),
  recurrenceStartDate: z.string().optional(),
  recurrenceEndDate: z.string().optional(),
  recurrenceCount: z.number().int().min(1).optional(),
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
  recurrenceType: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']).nullable().optional(),
  recurrenceInterval: z.number().int().min(1).nullable().optional(),
  recurrenceDays: z.string().nullable().optional(),
  recurrenceStartDate: z.string().nullable().optional(),
  recurrenceEndDate: z.string().nullable().optional(),
  recurrenceCount: z.number().int().min(1).nullable().optional(),
  statusRemarks: z.string().optional(),
  statusCcUserIds: z.array(z.string()).optional(),
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
  createdById: z.string().optional(),
  acceptanceStatus: z.string().optional(),
  search: z.string().optional(),
  dueBefore: z.string().optional(),
  dueAfter: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(50),
  sortBy: z.enum(['dueDate', 'priority', 'createdAt', 'title', 'status']).default('dueDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const taskProposalSchema = z.object({
  action: z.enum(['PROPOSED', 'ACCEPTED', 'CHANGES_REQUESTED', 'REPROPOSED', 'REJECTED']),
  proposedTitle: z.string().optional(),
  proposedDescription: z.string().optional(),
  comment: z.string().optional(),
});

export const rejectProposalSchema = z.object({
  comment: z.string().optional(),
});

export const requestChangesSchema = z.object({
  comment: z.string().min(1, 'Comment is required when requesting changes'),
});

export const reproposeSchema = z.object({
  proposedTitle: z.string().optional(),
  proposedDescription: z.string().optional(),
  comment: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type AddNoteInput = z.infer<typeof addNoteSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type TaskFilterInput = z.infer<typeof taskFilterSchema>;
export type TaskProposalInput = z.infer<typeof taskProposalSchema>;
export type RequestChangesInput = z.infer<typeof requestChangesSchema>;
export type ReproposeInput = z.infer<typeof reproposeSchema>;
export type RejectProposalInput = z.infer<typeof rejectProposalSchema>;

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

export const resetPasswordSchema = z.object({
  userId: z.string(),
  newPassword: z.string().min(8).optional(),
});

export const updatePreferencesSchema = z.object({
  emailDigestEnabled: z.boolean().optional(),
  emailRemindersEnabled: z.boolean().optional(),
  emailOverdueAlertsEnabled: z.boolean().optional(),
  emailBlockerAlertsEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

export const createEmailFollowUpSchema = z.object({
  recipientEmails: z.array(z.string().email()).min(1).max(20),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(10000),
  sendAt: z.string().optional(),
  recurrenceType: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']).optional(),
  recurrenceInterval: z.number().int().min(1).optional(),
  recurrenceDays: z.string().optional(),
  recurrenceEndDate: z.string().optional(),
  recurrenceCount: z.number().int().min(1).optional(),
});

export const updateEmailFollowUpSchema = z.object({
  recipientEmails: z.array(z.string().email()).min(1).max(20).optional(),
  subject: z.string().min(1).max(500).optional(),
  body: z.string().min(1).max(10000).optional(),
  sendAt: z.string().nullable().optional(),
  recurrenceType: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']).nullable().optional(),
  recurrenceInterval: z.number().int().min(1).nullable().optional(),
  recurrenceDays: z.string().nullable().optional(),
  recurrenceEndDate: z.string().nullable().optional(),
  recurrenceCount: z.number().int().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreateEmailFollowUpInput = z.infer<typeof createEmailFollowUpSchema>;
export type UpdateEmailFollowUpInput = z.infer<typeof updateEmailFollowUpSchema>;
