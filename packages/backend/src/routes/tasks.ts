import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { validate } from '../middleware/validate';
import { createTaskSchema, updateTaskSchema, taskFilterSchema, requestChangesSchema, reproposeSchema, rejectProposalSchema } from 'shared';
import { AppError } from '../middleware/error';
import { getVisibleTaskFilter, canEditTask, canEditAllTaskFields, getUserWorkstreamMemberships } from '../middleware/rbac';
import { createNotification } from './notifications';
import { createAuditLog } from './audit';
import { calculateNextRecurrenceDate } from '../services/recurrence';
import { sendBlockerAlert, sendStatusChangeAlert } from '../services/email';
import { getHODForTask } from '../services/escalation';
import { shouldSendEmail } from '../services/preference-check';
import quickAddRouter from './tasks-quick-add';

const router = Router();

// Quick Add (natural language) — must be registered before /:id routes
router.use('/quick-add', quickAddRouter);

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

const taskInclude = {
  workstream: { include: { department: { select: { id: true, name: true, code: true, color: true } } } },
  assignee: { select: { id: true, name: true, email: true, role: true, position: true, departmentId: true, dept: { select: { id: true, name: true } } } },
  createdBy: { select: { id: true, name: true, email: true } },
  parent: { select: { id: true, title: true } },
  subtasks: { select: { id: true, title: true, status: true, priority: true, dueDate: true, assignee: { select: { id: true, name: true } } } },
  attachments: { select: { id: true, filename: true, mimeType: true, size: true, createdAt: true } },
  _count: { select: { notes: true, subtasks: true, attachments: true } },
};

// GET / - list tasks with filters
router.get('/', validate(taskFilterSchema, 'query'), asyncHandler(async (req: Request, res: Response) => {
  const { status, priority, type, workstreamId, assigneeId, createdById, acceptanceStatus, search, dueBefore, dueAfter, page, limit, sortBy, sortOrder } = req.query as any;

  // Helper: comma-separated values → Prisma { in: [...] } or single value
  const multi = (val: string | undefined) => {
    if (!val) return undefined;
    const parts = val.split(',').filter(Boolean);
    return parts.length > 1 ? { in: parts } : parts[0];
  };

  const where: any = {};
  if (status) where.status = multi(status);
  if (priority) where.priority = multi(priority);
  if (type) where.type = multi(type);
  if (workstreamId) where.workstreamId = multi(workstreamId);
  if (assigneeId) where.assigneeId = multi(assigneeId);
  if (createdById) where.createdById = multi(createdById);
  if (acceptanceStatus) {
    const parts = String(acceptanceStatus).split(',').filter(Boolean);
    if (parts.length === 1 && parts[0] === 'Accepted') {
      where.OR = [{ acceptanceStatus: 'Accepted' }, { acceptanceStatus: null }];
    } else if (parts.includes('Accepted')) {
      where.OR = [{ acceptanceStatus: { in: parts.filter(p => p !== 'Accepted') } }, { acceptanceStatus: 'Accepted' }, { acceptanceStatus: null }];
    } else {
      where.acceptanceStatus = multi(acceptanceStatus);
    }
  }
  if (search) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      },
    ];
  }
  if (dueBefore || dueAfter) {
    where.dueDate = {};
    if (dueBefore === 'overdue') {
      where.dueDate.lt = new Date();
      where.status = { notIn: ['Done', 'Cancelled'] };
    } else if (dueBefore === 'thisWeek') {
      const endOfWeek = new Date();
      endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
      endOfWeek.setHours(23, 59, 59, 999);
      where.dueDate.lte = endOfWeek;
      where.status = { notIn: ['Done', 'Cancelled'] };
    } else if (dueBefore) {
      where.dueDate.lte = new Date(dueBefore);
    }
    if (dueAfter) where.dueDate.gte = new Date(dueAfter);
  }

  const rbacFilter = await getVisibleTaskFilter(req.user!);
  const combinedWhere = { AND: [rbacFilter, where] };

  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where: combinedWhere,
      include: taskInclude,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.task.count({ where: combinedWhere }),
  ]);

  // Compute canEdit per task using workstream memberships
  const memberships = await getUserWorkstreamMemberships(req.user!.id);
  const memberRoleMap = new Map(memberships.map(m => [m.workstreamId, m.role]));

  const tasksWithPermissions = tasks.map(t => {
    const isCreator = t.createdById === req.user!.id;
    const isAssignee = t.assigneeId === req.user!.id;
    const wsRole = t.workstreamId ? memberRoleMap.get(t.workstreamId) || null : null;
    const canEdit = isCreator || isAssignee || wsRole === 'HOD' || wsRole === 'MANAGER' || wsRole === 'STAFF';
    const canEditAll = isCreator || isAssignee || wsRole === 'HOD' || wsRole === 'MANAGER';
    return { ...t, canEdit, canEditAllFields: canEditAll };
  });

  res.json({
    tasks: tasksWithPermissions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}));

// GET /today - today's focus (due today or overdue + in progress)
router.get('/today', asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const rbacFilter = await getVisibleTaskFilter(req.user!);

  const tasks = await prisma.task.findMany({
    where: {
      AND: [
        rbacFilter,
        {
          OR: [
            { dueDate: { lte: endOfDay }, status: { notIn: ['Done', 'Cancelled'] } },
            { status: 'In Progress' },
          ],
        },
      ],
    },
    include: taskInclude,
    orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
  });

  res.json(tasks);
}));

// GET /waiting - waiting on others
router.get('/waiting', asyncHandler(async (req: Request, res: Response) => {
  const rbacFilter = await getVisibleTaskFilter(req.user!);

  const tasks = await prisma.task.findMany({
    where: {
      AND: [
        rbacFilter,
        {
          OR: [
            { type: 'Waiting On' },
            { status: 'Waiting On' },
          ],
          status: { notIn: ['Done', 'Cancelled'] },
        },
      ],
    },
    include: taskInclude,
    orderBy: [{ dueDate: 'asc' }],
  });

  res.json(tasks);
}));

// GET /pending-review - tasks needing acceptance action
router.get('/pending-review', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [asAssignee, asInitiator] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: userId, acceptanceStatus: 'Pending' },
      include: taskInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.task.findMany({
      where: {
        createdById: userId,
        acceptanceStatus: { in: ['Changes Requested', 'Reproposed'] },
      },
      include: taskInclude,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  res.json({ asAssignee, asInitiator });
}));

// GET /by-workstream - tasks grouped by workstream
router.get('/by-workstream', asyncHandler(async (req: Request, res: Response) => {
  const rbacFilter = await getVisibleTaskFilter(req.user!);

  const workstreams = await prisma.workstream.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      tasks: {
        where: { AND: [rbacFilter, { status: { notIn: ['Done', 'Cancelled'] } }] },
        include: taskInclude,
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      },
    },
  });

  res.json(workstreams);
}));

// GET /by-assignee - tasks grouped by assignee
router.get('/by-assignee', asyncHandler(async (req: Request, res: Response) => {
  const rbacFilter = await getVisibleTaskFilter(req.user!);

  // Get all visible tasks that are active
  const tasks = await prisma.task.findMany({
    where: { AND: [rbacFilter, { status: { notIn: ['Done', 'Cancelled'] } }] },
    include: {
      workstream: { include: { department: { select: { id: true, name: true, code: true, color: true } } } },
      assignee: {
        select: { id: true, name: true, email: true, role: true, position: true, departmentId: true, dept: { select: { id: true, name: true } } },
      },
    },
    orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
  });

  // Group by assignee
  const assigneeMap = new Map<string, any>();
  for (const task of tasks) {
    if (!task.assignee) continue;
    const key = task.assignee.id;
    if (!assigneeMap.has(key)) {
      assigneeMap.set(key, { ...task.assignee, assignedTasks: [] });
    }
    assigneeMap.get(key).assignedTasks.push(task);
  }

  res.json(Array.from(assigneeMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
}));

// GET /:id - task detail
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const rbacFilter = await getVisibleTaskFilter(req.user!);

  const task = await prisma.task.findFirst({
    where: { AND: [{ id: req.params.id }, rbacFilter] },
    include: {
      ...taskInclude,
      notes: {
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!task) throw new AppError(404, 'Task not found');

  const canEditDetail = await canEditTask(req.user!, task);
  const canEditAllDetail = await canEditAllTaskFields(req.user!, task);
  res.json({ ...task, canEdit: canEditDetail, canEditAllFields: canEditAllDetail });
}));

// GET /:id/proposals - negotiation history
router.get('/:id/proposals', asyncHandler(async (req: Request, res: Response) => {
  // RBAC: verify user has access to the task
  const rbacFilter = await getVisibleTaskFilter(req.user!);
  const task = await prisma.task.findFirst({ where: { AND: [{ id: req.params.id }, rbacFilter] } });
  if (!task) throw new AppError(404, 'Task not found');

  const proposals = await prisma.taskProposal.findMany({
    where: { taskId: req.params.id },
    include: { proposer: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(proposals);
}));

// POST / - create task
router.post('/', validate(createTaskSchema), asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;
  const userId = req.user!.id;

  // Determine acceptance status
  let acceptanceStatus: string | null = 'Accepted';
  if (data.assigneeId && data.assigneeId !== userId) {
    acceptanceStatus = 'Pending';
  }

  // Build recurrence data
  const taskData: any = {
    title: data.title,
    description: data.description,
    type: data.type,
    status: data.status,
    priority: data.priority,
    source: data.source,
    startDate: data.startDate ? new Date(data.startDate) : null,
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    assigneeId: data.assigneeId,
    workstreamId: data.workstreamId,
    parentId: data.parentId,
    waitingOnWhom: data.waitingOnWhom,
    createdById: userId,
    acceptanceStatus,
  };

  // Handle recurrence fields
  if (data.recurrenceType) {
    taskData.recurrenceType = data.recurrenceType;
    taskData.recurrenceInterval = data.recurrenceInterval || 1;
    taskData.recurrenceDays = data.recurrenceDays || null;
    taskData.recurrenceStartDate = data.recurrenceStartDate ? new Date(data.recurrenceStartDate) : null;
    taskData.recurrenceEndDate = data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null;
    taskData.recurrenceCount = data.recurrenceCount || null;
    taskData.type = 'Recurring';
    taskData.source = data.source === 'Manual' ? 'Recurring' : data.source;

    // Calculate first next recurrence date
    const nextDate = calculateNextRecurrenceDate({
      recurrenceType: data.recurrenceType,
      recurrenceInterval: data.recurrenceInterval || 1,
      recurrenceDays: data.recurrenceDays || null,
      recurrenceStartDate: data.recurrenceStartDate ? new Date(data.recurrenceStartDate) : null,
      recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null,
      recurrenceCount: data.recurrenceCount || null,
      recurrenceOccurrences: 0,
      nextRecurrenceDate: null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    });
    taskData.nextRecurrenceDate = nextDate;
  }

  const task = await prisma.task.create({
    data: taskData,
    include: taskInclude,
  });

  // Create initial proposal if pending
  if (acceptanceStatus === 'Pending') {
    await prisma.taskProposal.create({
      data: {
        taskId: task.id,
        proposerId: userId,
        action: 'PROPOSED',
        proposedTitle: data.title,
        proposedDescription: data.description,
      },
    });

    // Notify assignee
    await createNotification(
      data.assigneeId,
      'TASK_ASSIGNED',
      'New task assigned',
      `You have been assigned a new task: ${data.title}`,
      task.id,
    ).catch(err => console.error('Background task failed:', err.message)); // non-critical
  }

  // Audit log
  await createAuditLog(userId, 'task.created', task.id, {
    title: data.title,
    assigneeId: data.assigneeId,
  }).catch(err => console.error('Background task failed:', err.message));

  res.status(201).json(task);
}));

// POST /:id/accept - accept a task or counter-proposal
router.post('/:id/accept', asyncHandler(async (req: Request, res: Response) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id }, include: { createdBy: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } } } });
  if (!task) throw new AppError(404, 'Task not found');

  const userId = req.user!.id;
  let updateData: any = { acceptanceStatus: 'Accepted' };

  if (task.assigneeId === userId && task.acceptanceStatus === 'Pending') {
    // Assignee accepting
  } else if (task.createdById === userId && task.acceptanceStatus === 'Reproposed') {
    // Initiator accepting counter-proposal — changes already applied to task, just accept
  } else {
    throw new AppError(403, 'You cannot accept this task in its current state');
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: updateData,
    include: taskInclude,
  });

  await prisma.taskProposal.create({
    data: { taskId: task.id, proposerId: userId, action: 'ACCEPTED' },
  });

  // Notify the other party
  const notifyUserId = userId === task.assigneeId ? task.createdById : task.assigneeId;
  if (notifyUserId) {
    await createNotification(
      notifyUserId,
      'TASK_ACCEPTED',
      'Task accepted',
      `${req.user!.name} accepted task: ${updated.title}`,
      task.id,
    ).catch(err => console.error('Background task failed:', err.message));
  }

  await createAuditLog(userId, 'task.accepted', task.id).catch(err => console.error('Background task failed:', err.message));

  res.json(updated);
}));

// POST /:id/request-changes
router.post('/:id/request-changes', validate(requestChangesSchema), asyncHandler(async (req: Request, res: Response) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id }, include: { assignee: { select: { id: true, name: true } } } });
  if (!task) throw new AppError(404, 'Task not found');

  const userId = req.user!.id;
  if (task.assigneeId !== userId || task.acceptanceStatus !== 'Pending') {
    throw new AppError(403, 'You cannot request changes on this task');
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: { acceptanceStatus: 'Changes Requested' },
    include: taskInclude,
  });

  await prisma.taskProposal.create({
    data: {
      taskId: task.id,
      proposerId: userId,
      action: 'CHANGES_REQUESTED',
      comment: req.body.comment,
    },
  });

  // Notify creator
  await createNotification(
    task.createdById,
    'TASK_CHANGES_REQUESTED',
    'Changes requested',
    `${req.user!.name} requested changes on task: ${task.title}`,
    task.id,
  ).catch(err => console.error('Background task failed:', err.message));

  await createAuditLog(userId, 'task.changes_requested', task.id, { comment: req.body.comment }).catch(err => console.error('Background task failed:', err.message));

  res.json(updated);
}));

// POST /:id/repropose
router.post('/:id/repropose', validate(reproposeSchema), asyncHandler(async (req: Request, res: Response) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id }, include: { assignee: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } } });
  if (!task) throw new AppError(404, 'Task not found');

  const userId = req.user!.id;
  const { proposedTitle, proposedDescription, comment } = req.body;

  if (task.assigneeId === userId && task.acceptanceStatus === 'Pending') {
    // Assignee counter-proposing — apply new values directly, save originals as snapshot
    if (!proposedTitle && !proposedDescription && !comment) {
      throw new AppError(400, 'At least one field is required when counter-proposing');
    }

    // Save original values as snapshot in the proposal for potential revert
    const snapshotTitle = task.title;
    const snapshotDescription = task.description;

    // Apply the assignee's proposed changes directly to the task
    const taskUpdate: any = { acceptanceStatus: 'Reproposed' };
    if (proposedTitle) taskUpdate.title = proposedTitle;
    if (proposedDescription) taskUpdate.description = proposedDescription;

    await prisma.task.update({
      where: { id: task.id },
      data: taskUpdate,
    });

    // Store the ORIGINAL values in the proposal record (for revert on reject)
    await prisma.taskProposal.create({
      data: {
        taskId: task.id,
        proposerId: userId,
        action: 'REPROPOSED',
        proposedTitle: snapshotTitle,
        proposedDescription: snapshotDescription,
        comment,
      },
    });

    // Notify creator
    await createNotification(
      task.createdById,
      'TASK_REPROPOSED',
      'Counter-proposal',
      `${req.user!.name} counter-proposed task: ${task.title}`,
      task.id,
    ).catch(err => console.error('Background task failed:', err.message));

    await createAuditLog(userId, 'task.reproposed', task.id, { proposedTitle, proposedDescription, comment }).catch(err => console.error('Background task failed:', err.message));

  } else if (task.createdById === userId && task.acceptanceStatus === 'Changes Requested') {
    // Initiator re-proposing after changes requested
    const updateData: any = { acceptanceStatus: 'Pending' };
    if (proposedTitle) updateData.title = proposedTitle;
    if (proposedDescription) updateData.description = proposedDescription;

    await prisma.task.update({
      where: { id: task.id },
      data: updateData,
    });

    await prisma.taskProposal.create({
      data: {
        taskId: task.id,
        proposerId: userId,
        action: 'PROPOSED',
        proposedTitle,
        proposedDescription,
        comment,
      },
    });

    // Notify assignee
    if (task.assigneeId) {
      await createNotification(
        task.assigneeId,
        'TASK_ASSIGNED',
        'Task re-proposed',
        `${req.user!.name} re-proposed task: ${proposedTitle || task.title}`,
        task.id,
      ).catch(err => console.error('Background task failed:', err.message));
    }

    await createAuditLog(userId, 'task.reproposed', task.id, { proposedTitle, proposedDescription, comment }).catch(err => console.error('Background task failed:', err.message));
  } else {
    throw new AppError(403, 'You cannot repropose this task in its current state');
  }

  const updated = await prisma.task.findUnique({ where: { id: task.id }, include: taskInclude });
  res.json(updated);
}));

// POST /:id/reject-proposal - initiator rejects counter-proposal, reverts task
router.post('/:id/reject-proposal', validate(rejectProposalSchema), asyncHandler(async (req: Request, res: Response) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id }, include: { assignee: { select: { id: true, name: true } } } });
  if (!task) throw new AppError(404, 'Task not found');

  const userId = req.user!.id;
  if (task.createdById !== userId || task.acceptanceStatus !== 'Reproposed') {
    throw new AppError(403, 'You cannot reject a proposal on this task in its current state');
  }

  // Find the last REPROPOSED proposal — its proposedTitle/proposedDescription are the ORIGINAL values (snapshot)
  const lastProposal = await prisma.taskProposal.findFirst({
    where: { taskId: task.id, action: 'REPROPOSED' },
    orderBy: { createdAt: 'desc' },
  });

  // Revert task to original values and reset to Pending (resend to same assignee)
  const revertData: any = { acceptanceStatus: 'Pending' };
  if (lastProposal?.proposedTitle) revertData.title = lastProposal.proposedTitle;
  if (lastProposal?.proposedDescription) revertData.description = lastProposal.proposedDescription;

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: revertData,
    include: taskInclude,
  });

  // Create REJECTED proposal record
  await prisma.taskProposal.create({
    data: {
      taskId: task.id,
      proposerId: userId,
      action: 'REJECTED',
      comment: req.body.comment,
    },
  });

  // Notify assignee
  if (task.assigneeId) {
    await createNotification(
      task.assigneeId,
      'TASK_CHANGES_REQUESTED',
      'Counter-proposal rejected',
      `${req.user!.name} rejected your counter-proposal on task: ${updated.title}. The task has been resent to you.`,
      task.id,
    ).catch(err => console.error('Background task failed:', err.message));
  }

  await createAuditLog(userId, 'task.proposal_rejected', task.id, { comment: req.body.comment }).catch(err => console.error('Background task failed:', err.message));

  res.json(updated);
}));

// PATCH /:id - update task
router.patch('/:id', validate(updateTaskSchema), asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, 'Task not found');

  // RBAC check
  const allowed = await canEditTask(req.user!, existing);
  if (!allowed) throw new AppError(403, 'You do not have permission to edit this task');

  const { statusRemarks, statusCcUserIds, ...bodyRest } = req.body;
  const data: any = { ...bodyRest };
  const userId = req.user!.id;

  // Workstream-based field restriction: if user is STAFF in this workstream
  // (and not creator/assignee), restrict to status-only updates
  const canEditAll = await canEditAllTaskFields(req.user!, existing);
  if (!canEditAll) {
    const allowedFields = ['status'];
    const attemptedFields = Object.keys(data);
    const disallowed = attemptedFields.filter(f => !allowedFields.includes(f));
    if (disallowed.length > 0) {
      throw new AppError(403, `You can only update status for this task. Cannot update: ${disallowed.join(', ')}`);
    }
  }

  if (data.startDate !== undefined) {
    data.startDate = data.startDate ? new Date(data.startDate) : null;
  }
  if (data.dueDate !== undefined) {
    data.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }

  // Handle recurrence field updates
  if (data.recurrenceType !== undefined || data.recurrenceInterval !== undefined || data.recurrenceDays !== undefined) {
    if (data.recurrenceStartDate !== undefined) {
      data.recurrenceStartDate = data.recurrenceStartDate ? new Date(data.recurrenceStartDate) : null;
    }
    if (data.recurrenceEndDate !== undefined) {
      data.recurrenceEndDate = data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null;
    }
    // Recompute nextRecurrenceDate
    const merged = { ...existing, ...data };
    const nextDate = calculateNextRecurrenceDate({
      recurrenceType: merged.recurrenceType,
      recurrenceInterval: merged.recurrenceInterval,
      recurrenceDays: merged.recurrenceDays,
      recurrenceStartDate: merged.recurrenceStartDate,
      recurrenceEndDate: merged.recurrenceEndDate,
      recurrenceCount: merged.recurrenceCount,
      recurrenceOccurrences: merged.recurrenceOccurrences,
      nextRecurrenceDate: merged.nextRecurrenceDate,
      dueDate: merged.dueDate,
    });
    data.nextRecurrenceDate = nextDate;
  }

  // Set completedAt when marking as done
  if (data.status === 'Done' && existing.status !== 'Done') {
    data.completedAt = new Date();
  }
  if (data.status && data.status !== 'Done') {
    data.completedAt = null;
  }

  // Handle reassignment: reset acceptance status
  if (data.assigneeId !== undefined) {
    if (data.assigneeId && data.assigneeId !== existing.assigneeId) {
      if (data.assigneeId !== userId) {
        data.acceptanceStatus = 'Pending';
      } else {
        data.acceptanceStatus = 'Accepted';
      }
    } else if (!data.assigneeId) {
      data.acceptanceStatus = 'Accepted';
    }
  }

  // Build audit details (changed fields only)
  const changedFields: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    if ((existing as any)[key] !== data[key]) {
      changedFields[key] = { from: (existing as any)[key], to: data[key] };
    }
  }

  const task = await prisma.task.update({
    where: { id: req.params.id },
    data,
    include: taskInclude,
  });

  // Status change alerts: Blocked or Waiting On with remarks + CC
  if ((data.status === 'Blocked' || data.status === 'Waiting On') && existing.status !== data.status) {
    const remarks = statusRemarks || '';
    const ccUserIds: string[] = statusCcUserIds || [];
    const changedByName = req.user!.name;
    const isBlocked = data.status === 'Blocked';
    const notifType = isBlocked ? 'TASK_BLOCKED' : 'TASK_WAITING';
    const notifTitle = isBlocked ? 'Task blocked' : 'Task waiting';
    const notifMsg = remarks
      ? `${changedByName} marked "${task.title}" as ${data.status}: ${remarks}`
      : `${changedByName} marked "${task.title}" as ${data.status}`;

    // 1. Save remarks as a Note
    if (remarks) {
      await prisma.note.create({
        data: {
          taskId: task.id,
          authorId: userId,
          content: remarks,
          type: isBlocked ? 'Blocker Report' : 'Status Update',
        },
      }).catch(err => console.error('Status remarks note failed:', err.message));
    }

    // 2. Notify HOD
    const hodId = await getHODForTask(existing).catch(() => null);
    if (hodId && hodId !== userId) {
      await createNotification(hodId, notifType, notifTitle, notifMsg, task.id)
        .catch(err => console.error('HOD notification failed:', err.message));
      shouldSendEmail(hodId, 'blocker').then(async (allowed) => {
        if (allowed) await sendStatusChangeAlert(task.id, hodId, data.status, remarks, changedByName);
      }).catch(err => console.error('HOD status email failed:', err.message));
    }

    // 3. Notify task creator (initiator)
    if (existing.createdById && existing.createdById !== userId && existing.createdById !== hodId) {
      await createNotification(existing.createdById, notifType, notifTitle, notifMsg, task.id)
        .catch(err => console.error('Creator notification failed:', err.message));
      shouldSendEmail(existing.createdById, 'blocker').then(async (allowed) => {
        if (allowed) await sendStatusChangeAlert(task.id, existing.createdById, data.status, remarks, changedByName);
      }).catch(err => console.error('Creator status email failed:', err.message));
    }

    // 4. Notify CC'd users (deduped)
    const notifiedIds = new Set([userId, hodId, existing.createdById].filter(Boolean));
    for (const ccId of ccUserIds) {
      if (!notifiedIds.has(ccId)) {
        notifiedIds.add(ccId);
        await createNotification(ccId, notifType, notifTitle, notifMsg, task.id)
          .catch(err => console.error('CC notification failed:', err.message));
        shouldSendEmail(ccId, 'blocker').then(async (allowed) => {
          if (allowed) await sendStatusChangeAlert(task.id, ccId, data.status, remarks, changedByName);
        }).catch(err => console.error('CC status email failed:', err.message));
      }
    }

    // 5. Also send legacy blocker alert to assignee for Blocked status
    if (isBlocked && existing.assigneeId && existing.assigneeId !== userId) {
      shouldSendEmail(existing.assigneeId, 'blocker').then(async (allowed) => {
        if (allowed) await sendBlockerAlert(task.id, existing.assigneeId!, 'assignee');
      }).catch(err => console.error('Blocker alert failed:', err.message));
    }
  }

  // Notifications
  if (data.assigneeId && data.assigneeId !== existing.assigneeId && data.assigneeId !== userId) {
    await createNotification(
      data.assigneeId,
      'TASK_ASSIGNED',
      'New task assigned',
      `You have been assigned task: ${task.title}`,
      task.id,
    ).catch(err => console.error('Background task failed:', err.message));

    // Create proposal for new assignee
    await prisma.taskProposal.create({
      data: {
        taskId: task.id,
        proposerId: userId,
        action: 'PROPOSED',
        proposedTitle: task.title,
        proposedDescription: task.description,
      },
    }).catch(err => console.error('Background task failed:', err.message));
  }

  if (data.status === 'Done' && existing.status !== 'Done') {
    // Notify creator if different from person completing
    if (existing.createdById !== userId) {
      await createNotification(
        existing.createdById,
        'TASK_COMPLETED',
        'Task completed',
        `${req.user!.name} completed task: ${task.title}`,
        task.id,
      ).catch(err => console.error('Background task failed:', err.message));
    }

    await createAuditLog(userId, 'task.completed', task.id, { title: task.title }).catch(err => console.error('Background task failed:', err.message));
  }

  // Audit log for update
  if (Object.keys(changedFields).length > 0) {
    await createAuditLog(userId, 'task.updated', task.id, changedFields).catch(err => console.error('Background task failed:', err.message));
  }

  res.json(task);
}));

// DELETE /:id - delete task (ED or task creator only)
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, 'Task not found');

  if (req.user!.role !== 'SUPER_ADMIN' && req.user!.role !== 'ED' && existing.createdById !== req.user!.id) {
    throw new AppError(403, 'Only ED, SUPER_ADMIN, or the task creator can delete tasks');
  }

  await prisma.task.delete({ where: { id: req.params.id } });

  await createAuditLog(req.user!.id, 'task.deleted', req.params.id, { title: existing.title }).catch(err => console.error('Background task failed:', err.message));

  res.json({ message: 'Task deleted' });
}));

export default router;
