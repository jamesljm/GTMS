import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { validate } from '../middleware/validate';
import { createTaskSchema, updateTaskSchema, taskFilterSchema, requestChangesSchema, reproposeSchema } from 'shared';
import { AppError } from '../middleware/error';
import { getVisibleTaskFilter, canEditTask } from '../middleware/rbac';
import { createNotification } from './notifications';
import { createAuditLog } from './audit';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

const taskInclude = {
  workstream: true,
  assignee: { select: { id: true, name: true, email: true, role: true, position: true, departmentId: true, dept: { select: { id: true, name: true } } } },
  createdBy: { select: { id: true, name: true, email: true } },
  parent: { select: { id: true, title: true } },
  subtasks: { select: { id: true, title: true, status: true, priority: true, dueDate: true, assignee: { select: { id: true, name: true } } } },
  attachments: { select: { id: true, filename: true, mimeType: true, size: true, createdAt: true } },
  _count: { select: { notes: true, subtasks: true, attachments: true } },
};

// GET / - list tasks with filters
router.get('/', validate(taskFilterSchema, 'query'), asyncHandler(async (req: Request, res: Response) => {
  const { status, priority, type, workstreamId, assigneeId, acceptanceStatus, search, dueBefore, dueAfter, page, limit, sortBy, sortOrder } = req.query as any;

  const where: any = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (type) where.type = type;
  if (workstreamId) where.workstreamId = workstreamId;
  if (assigneeId) where.assigneeId = assigneeId;
  if (acceptanceStatus) {
    if (acceptanceStatus === 'Accepted') {
      where.OR = [{ acceptanceStatus: 'Accepted' }, { acceptanceStatus: null }];
    } else {
      where.acceptanceStatus = acceptanceStatus;
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

  res.json({
    tasks,
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
  const user = req.user!;

  let userWhere: any = { isActive: true };
  if (user.role === 'HOD' || user.role === 'MANAGER') {
    if (user.departmentId) {
      userWhere = { isActive: true, departmentId: user.departmentId };
    } else {
      userWhere = { isActive: true, id: user.id };
    }
  } else if (user.role === 'STAFF') {
    userWhere = { isActive: true, id: user.id };
  }

  const users = await prisma.user.findMany({
    where: userWhere,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      position: true,
      departmentId: true,
      dept: { select: { id: true, name: true } },
      assignedTasks: {
        where: { status: { notIn: ['Done', 'Cancelled'] } },
        include: { workstream: true },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      },
    },
  });

  res.json(users.filter(u => u.assignedTasks.length > 0));
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
  res.json(task);
}));

// GET /:id/proposals - negotiation history
router.get('/:id/proposals', asyncHandler(async (req: Request, res: Response) => {
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

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      type: data.type,
      status: data.status,
      priority: data.priority,
      source: data.source,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      assigneeId: data.assigneeId,
      workstreamId: data.workstreamId,
      parentId: data.parentId,
      waitingOnWhom: data.waitingOnWhom,
      recurringCron: data.recurringCron,
      createdById: userId,
      acceptanceStatus,
    },
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
    ).catch(() => {}); // non-critical
  }

  // Audit log
  await createAuditLog(userId, 'task.created', task.id, {
    title: data.title,
    assigneeId: data.assigneeId,
  }).catch(() => {});

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
    // Initiator accepting counter-proposal — apply proposed changes
    const lastProposal = await prisma.taskProposal.findFirst({
      where: { taskId: task.id, action: 'REPROPOSED' },
      orderBy: { createdAt: 'desc' },
    });
    if (lastProposal) {
      if (lastProposal.proposedTitle) updateData.title = lastProposal.proposedTitle;
      if (lastProposal.proposedDescription) updateData.description = lastProposal.proposedDescription;
    }
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
    ).catch(() => {});
  }

  await createAuditLog(userId, 'task.accepted', task.id).catch(() => {});

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
  ).catch(() => {});

  await createAuditLog(userId, 'task.changes_requested', task.id, { comment: req.body.comment }).catch(() => {});

  res.json(updated);
}));

// POST /:id/repropose
router.post('/:id/repropose', validate(reproposeSchema), asyncHandler(async (req: Request, res: Response) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id }, include: { assignee: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } } });
  if (!task) throw new AppError(404, 'Task not found');

  const userId = req.user!.id;
  const { proposedTitle, proposedDescription, comment } = req.body;

  if (task.assigneeId === userId && task.acceptanceStatus === 'Pending') {
    // Assignee counter-proposing
    if (!proposedTitle && !proposedDescription && !comment) {
      throw new AppError(400, 'At least one field is required when counter-proposing');
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { acceptanceStatus: 'Reproposed' },
    });

    await prisma.taskProposal.create({
      data: {
        taskId: task.id,
        proposerId: userId,
        action: 'REPROPOSED',
        proposedTitle,
        proposedDescription,
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
    ).catch(() => {});

    await createAuditLog(userId, 'task.reproposed', task.id, { proposedTitle, proposedDescription, comment }).catch(() => {});

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
      ).catch(() => {});
    }

    await createAuditLog(userId, 'task.reproposed', task.id, { proposedTitle, proposedDescription, comment }).catch(() => {});
  } else {
    throw new AppError(403, 'You cannot repropose this task in its current state');
  }

  const updated = await prisma.task.findUnique({ where: { id: task.id }, include: taskInclude });
  res.json(updated);
}));

// PATCH /:id - update task
router.patch('/:id', validate(updateTaskSchema), asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, 'Task not found');

  // RBAC check
  const allowed = await canEditTask(req.user!, existing);
  if (!allowed) throw new AppError(403, 'You do not have permission to edit this task');

  const data: any = { ...req.body };
  const userId = req.user!.id;

  // STAFF can only update status
  if (req.user!.role === 'STAFF' && existing.assigneeId !== req.user!.id && existing.createdById !== req.user!.id) {
    throw new AppError(403, 'You do not have permission to edit this task');
  }
  if (req.user!.role === 'STAFF') {
    const allowedFields = ['status'];
    const attemptedFields = Object.keys(data);
    const disallowed = attemptedFields.filter(f => !allowedFields.includes(f));
    if (disallowed.length > 0) {
      throw new AppError(403, `Staff can only update status. Cannot update: ${disallowed.join(', ')}`);
    }
  }

  if (data.dueDate !== undefined) {
    data.dueDate = data.dueDate ? new Date(data.dueDate) : null;
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

  // Notifications
  if (data.assigneeId && data.assigneeId !== existing.assigneeId && data.assigneeId !== userId) {
    await createNotification(
      data.assigneeId,
      'TASK_ASSIGNED',
      'New task assigned',
      `You have been assigned task: ${task.title}`,
      task.id,
    ).catch(() => {});

    // Create proposal for new assignee
    await prisma.taskProposal.create({
      data: {
        taskId: task.id,
        proposerId: userId,
        action: 'PROPOSED',
        proposedTitle: task.title,
        proposedDescription: task.description,
      },
    }).catch(() => {});
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
      ).catch(() => {});
    }

    await createAuditLog(userId, 'task.completed', task.id, { title: task.title }).catch(() => {});
  }

  // Audit log for update
  if (Object.keys(changedFields).length > 0) {
    await createAuditLog(userId, 'task.updated', task.id, changedFields).catch(() => {});
  }

  res.json(task);
}));

// DELETE /:id - delete task (ED or task creator only)
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, 'Task not found');

  if (req.user!.role !== 'ED' && existing.createdById !== req.user!.id) {
    throw new AppError(403, 'Only ED or the task creator can delete tasks');
  }

  await prisma.task.delete({ where: { id: req.params.id } });

  await createAuditLog(req.user!.id, 'task.deleted', req.params.id, { title: existing.title }).catch(() => {});

  res.json({ message: 'Task deleted' });
}));

export default router;
