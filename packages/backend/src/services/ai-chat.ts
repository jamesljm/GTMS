import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { prisma } from '../prisma';
import { createNotification } from '../routes/notifications';
import { createAuditLog } from '../routes/audit';
import { getVisibleTaskFilter, canEditTask } from '../middleware/rbac';
import { AuthUser } from '../middleware/auth';
import { calculateNextRecurrenceDate } from './recurrence';

const anthropic = config.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })
  : null;

const tools: Anthropic.Tool[] = [
  {
    name: 'create_task',
    description: 'Create a new task in GTMS. Use this when the user wants to add a new task, follow-up, or action item.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Task title (clear, actionable)' },
        description: { type: 'string', description: 'Optional detailed description' },
        type: { type: 'string', enum: ['My Action', 'Waiting On', 'Decision', 'Review', 'Recurring'], description: 'Task type' },
        priority: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'], description: 'Task priority' },
        workstreamCode: { type: 'string', enum: ['STR', 'COM', 'IR', 'IT', 'HR', 'FIN', 'ESG', 'OPS', 'LEG', 'ACU', 'GPL', 'ADM', 'FAN', 'TEN', 'RT'], description: 'Workstream code' },
        assigneeEmail: { type: 'string', description: 'Email of the person to assign to' },
        dueDate: { type: 'string', description: 'Due date in ISO format (YYYY-MM-DD)' },
        waitingOnWhom: { type: 'string', description: 'Who we are waiting on (if type is Waiting On)' },
        recurrenceType: { type: 'string', enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'], description: 'Recurrence frequency. When set, type will be auto-set to Recurring.' },
        recurrenceInterval: { type: 'number', description: 'Repeat every N periods (default 1)' },
        recurrenceDays: { type: 'string', description: 'JSON array of days for weekly (e.g. ["Mon","Wed"]), day number for monthly (e.g. "15"), or ordinal weekday (e.g. "first_Monday")' },
        recurrenceEndDate: { type: 'string', description: 'Stop recurring after this date (ISO format)' },
        recurrenceCount: { type: 'number', description: 'Stop after N occurrences' },
      },
      required: ['title', 'type', 'priority'],
    },
  },
  {
    name: 'update_task',
    description: 'Update an existing task. Use this when the user wants to change status, priority, due date, or other fields.',
    input_schema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'The task ID to update' },
        title: { type: 'string', description: 'New title' },
        status: { type: 'string', enum: ['Not Started', 'In Progress', 'Waiting On', 'Blocked', 'Done', 'Cancelled'] },
        priority: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
        dueDate: { type: 'string', description: 'New due date in ISO format' },
        assigneeEmail: { type: 'string', description: 'New assignee email' },
        waitingOnWhom: { type: 'string' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'query_tasks',
    description: 'Search and filter tasks. Use this when the user asks about task status, lists, or wants to find specific tasks.',
    input_schema: {
      type: 'object' as const,
      properties: {
        search: { type: 'string', description: 'Search term for title/description' },
        status: { type: 'string', enum: ['Not Started', 'In Progress', 'Waiting On', 'Blocked', 'Done', 'Cancelled'] },
        priority: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
        workstreamCode: { type: 'string', enum: ['STR', 'COM', 'IR', 'IT', 'HR', 'FIN', 'ESG', 'OPS', 'LEG', 'ACU', 'GPL', 'ADM', 'FAN', 'TEN', 'RT'] },
        assigneeEmail: { type: 'string' },
        overdue: { type: 'boolean', description: 'Only show overdue tasks' },
        limit: { type: 'number', description: 'Max results to return (default 10)' },
      },
      required: [],
    },
  },
  {
    name: 'add_note',
    description: 'Add a note or comment to a task.',
    input_schema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'The task to add a note to' },
        content: { type: 'string', description: 'Note content' },
        type: { type: 'string', enum: ['Comment', 'Status Update', 'Blocker Report', 'System Log'], description: 'Note type' },
      },
      required: ['taskId', 'content'],
    },
  },
  {
    name: 'create_subtask',
    description: 'Create a subtask under an existing parent task.',
    input_schema: {
      type: 'object' as const,
      properties: {
        parentId: { type: 'string', description: 'Parent task ID' },
        title: { type: 'string', description: 'Subtask title' },
        priority: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
        assigneeEmail: { type: 'string' },
        dueDate: { type: 'string' },
      },
      required: ['parentId', 'title'],
    },
  },
  {
    name: 'bulk_update',
    description: 'Update multiple tasks at once. Use when user wants to mark several tasks done, change priority of multiple items, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        taskIds: { type: 'array', items: { type: 'string' }, description: 'Array of task IDs to update' },
        status: { type: 'string', enum: ['Not Started', 'In Progress', 'Waiting On', 'Blocked', 'Done', 'Cancelled'] },
        priority: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
      },
      required: ['taskIds'],
    },
  },
];

async function executeTool(name: string, input: any, userId: string, user?: AuthUser): Promise<any> {
  switch (name) {
    case 'create_task': {
      let workstreamId = null;
      if (input.workstreamCode) {
        const ws = await prisma.workstream.findUnique({ where: { code: input.workstreamCode } });
        workstreamId = ws?.id || null;
      }
      let assigneeId = null;
      if (input.assigneeEmail) {
        const user = await prisma.user.findUnique({ where: { email: input.assigneeEmail } });
        assigneeId = user?.id || null;
      }

      // Set acceptance status
      const acceptanceStatus = (assigneeId && assigneeId !== userId) ? 'Pending' : 'Accepted';

      const taskData: any = {
        title: input.title,
        description: input.description || null,
        type: input.type,
        priority: input.priority,
        status: 'Not Started',
        source: 'Chat',
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        waitingOnWhom: input.waitingOnWhom || null,
        workstreamId,
        assigneeId,
        createdById: userId,
        acceptanceStatus,
      };

      // Handle recurrence
      if (input.recurrenceType) {
        taskData.recurrenceType = input.recurrenceType;
        taskData.recurrenceInterval = input.recurrenceInterval || 1;
        taskData.recurrenceDays = input.recurrenceDays || null;
        taskData.recurrenceEndDate = input.recurrenceEndDate ? new Date(input.recurrenceEndDate) : null;
        taskData.recurrenceCount = input.recurrenceCount || null;
        taskData.type = 'Recurring';
        taskData.source = 'Recurring';

        const nextDate = calculateNextRecurrenceDate({
          recurrenceType: input.recurrenceType,
          recurrenceInterval: input.recurrenceInterval || 1,
          recurrenceDays: input.recurrenceDays || null,
          recurrenceStartDate: null,
          recurrenceEndDate: input.recurrenceEndDate ? new Date(input.recurrenceEndDate) : null,
          recurrenceCount: input.recurrenceCount || null,
          recurrenceOccurrences: 0,
          nextRecurrenceDate: null,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
        });
        taskData.nextRecurrenceDate = nextDate;
      }

      const task = await prisma.task.create({
        data: taskData,
        include: { workstream: true, assignee: { select: { name: true, email: true } } },
      });

      // Create proposal if pending
      if (acceptanceStatus === 'Pending' && assigneeId) {
        await prisma.taskProposal.create({
          data: { taskId: task.id, proposerId: userId, action: 'PROPOSED', proposedTitle: input.title, proposedDescription: input.description },
        }).catch(err => console.error('AI chat background task failed:', err.message));
        await createNotification(assigneeId, 'TASK_ASSIGNED', 'New task assigned', `You have been assigned: ${input.title}`, task.id).catch(err => console.error('AI chat background task failed:', err.message));
      }
      await createAuditLog(userId, 'task.created', task.id, { title: input.title, source: 'Chat' }).catch(err => console.error('AI chat background task failed:', err.message));

      return { action: 'created', task: { id: task.id, title: task.title, priority: task.priority, workstream: task.workstream?.code, assignee: task.assignee?.name, dueDate: task.dueDate, acceptanceStatus } };
    }

    case 'update_task': {
      const existing = await prisma.task.findUnique({ where: { id: input.taskId } });
      if (!existing) return { error: 'Task not found' };

      // RBAC check
      if (user) {
        const allowed = await canEditTask(user, existing);
        if (!allowed) return { error: 'You do not have permission to edit this task' };
      }

      const data: any = {};
      if (input.title) data.title = input.title;
      if (input.status) {
        data.status = input.status;
        if (input.status === 'Done') data.completedAt = new Date();
      }
      if (input.priority) data.priority = input.priority;
      if (input.dueDate) data.dueDate = new Date(input.dueDate);
      if (input.waitingOnWhom) data.waitingOnWhom = input.waitingOnWhom;
      if (input.assigneeEmail) {
        const user = await prisma.user.findUnique({ where: { email: input.assigneeEmail } });
        if (user) {
          data.assigneeId = user.id;
          // Reset acceptance if reassigned to different person
          if (user.id !== existing.assigneeId && user.id !== userId) {
            data.acceptanceStatus = 'Pending';
          }
        }
      }

      const task = await prisma.task.update({
        where: { id: input.taskId },
        data,
        include: { workstream: true, assignee: { select: { name: true } } },
      });

      // Audit & notifications
      if (input.status === 'Done' && existing.status !== 'Done') {
        await createAuditLog(userId, 'task.completed', task.id, { title: task.title }).catch(err => console.error('AI chat background task failed:', err.message));
        if (existing.createdById !== userId) {
          await createNotification(existing.createdById, 'TASK_COMPLETED', 'Task completed', `Task completed: ${task.title}`, task.id).catch(err => console.error('AI chat background task failed:', err.message));
        }
      } else {
        await createAuditLog(userId, 'task.updated', task.id, data).catch(err => console.error('AI chat background task failed:', err.message));
      }

      return { action: 'updated', task: { id: task.id, title: task.title, status: task.status, priority: task.priority } };
    }

    case 'query_tasks': {
      const where: any = { status: { notIn: ['Done', 'Cancelled'] } };

      // Apply RBAC filter
      if (user) {
        const rbacFilter = await getVisibleTaskFilter(user);
        if (Object.keys(rbacFilter).length > 0) {
          where.AND = [rbacFilter];
        }
      }
      if (input.search) {
        where.OR = [
          { title: { contains: input.search, mode: 'insensitive' } },
          { description: { contains: input.search, mode: 'insensitive' } },
        ];
      }
      if (input.status) where.status = input.status;
      if (input.priority) where.priority = input.priority;
      if (input.workstreamCode) {
        const ws = await prisma.workstream.findUnique({ where: { code: input.workstreamCode } });
        if (ws) where.workstreamId = ws.id;
      }
      if (input.assigneeEmail) {
        const user = await prisma.user.findUnique({ where: { email: input.assigneeEmail } });
        if (user) where.assigneeId = user.id;
      }
      if (input.overdue) {
        where.dueDate = { lt: new Date() };
        delete where.status;
        where.status = { notIn: ['Done', 'Cancelled'] };
      }

      const tasks = await prisma.task.findMany({
        where,
        include: {
          workstream: { select: { code: true, name: true } },
          assignee: { select: { name: true, email: true } },
        },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
        take: input.limit || 10,
      });

      return { count: tasks.length, tasks: tasks.map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, workstream: t.workstream?.code, assignee: t.assignee?.name, dueDate: t.dueDate, waitingOnWhom: t.waitingOnWhom })) };
    }

    case 'add_note': {
      // Verify access to task
      if (user) {
        const rbacFilter = await getVisibleTaskFilter(user);
        const task = await prisma.task.findFirst({ where: { AND: [{ id: input.taskId }, rbacFilter] } });
        if (!task) return { error: 'Task not found or no access' };
      }

      const note = await prisma.note.create({
        data: {
          taskId: input.taskId,
          content: input.content,
          type: input.type || 'Comment',
          authorId: userId,
        },
      });
      return { action: 'note_added', noteId: note.id, taskId: input.taskId };
    }

    case 'create_subtask': {
      let assigneeId = null;
      if (input.assigneeEmail) {
        const assignee = await prisma.user.findUnique({ where: { email: input.assigneeEmail } });
        assigneeId = assignee?.id || null;
      }

      const parent = await prisma.task.findUnique({ where: { id: input.parentId } });
      if (!parent) return { error: 'Parent task not found' };

      // Check access to parent task
      if (user) {
        const allowed = await canEditTask(user, parent);
        if (!allowed) return { error: 'You do not have permission to add subtasks to this task' };
      }

      const subtask = await prisma.task.create({
        data: {
          title: input.title,
          type: 'My Action',
          priority: input.priority || parent.priority,
          status: 'Not Started',
          source: 'Chat',
          dueDate: input.dueDate ? new Date(input.dueDate) : parent.dueDate,
          parentId: input.parentId,
          workstreamId: parent.workstreamId,
          assigneeId,
          createdById: userId,
        },
      });
      return { action: 'subtask_created', subtask: { id: subtask.id, title: subtask.title, parentId: input.parentId } };
    }

    case 'bulk_update': {
      // Filter to only tasks the user can edit
      let taskIds = input.taskIds;
      if (user) {
        const rbacFilter = await getVisibleTaskFilter(user);
        const accessibleTasks = await prisma.task.findMany({
          where: { AND: [{ id: { in: input.taskIds } }, rbacFilter] },
          select: { id: true },
        });
        taskIds = accessibleTasks.map((t: any) => t.id);
      }

      const data: any = {};
      if (input.status) {
        data.status = input.status;
        if (input.status === 'Done') data.completedAt = new Date();
      }
      if (input.priority) data.priority = input.priority;

      const result = await prisma.task.updateMany({
        where: { id: { in: taskIds } },
        data,
      });
      return { action: 'bulk_updated', count: result.count, status: input.status, priority: input.priority };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function buildSystemPrompt(userId?: string): Promise<string> {
  // NOTE: Do NOT include a timestamp here — it would invalidate the prompt cache on every request.
  // Date awareness is handled per-turn (chrono-node parses dates from user input using the real wall clock).
  let wsInfo = '';
  let teamInfo = '';
  let userIntro = '';

  // If we know the user, only include context they care about
  if (userId) {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        dept: { select: { id: true, name: true, code: true } },
        workstreamMemberships: { include: { workstream: true } },
      },
    });

    const isHighLevel = me?.role === 'ED' || me?.role === 'SUPER_ADMIN';

    // Workstreams: ED/SUPER_ADMIN sees all; others see only their memberships
    const workstreams = isHighLevel
      ? await prisma.workstream.findMany({ orderBy: { sortOrder: 'asc' } })
      : (me?.workstreamMemberships || []).map(m => m.workstream);
    wsInfo = workstreams.map(ws => `${ws.code}: ${ws.name}`).join('\n') || '(none)';

    // Team: ED/SUPER_ADMIN sees all active; others see same-dept + same-workstream colleagues
    const wsIds = (me?.workstreamMemberships || []).map(m => m.workstreamId);
    const collaborators = isHighLevel
      ? await prisma.user.findMany({
          where: { isActive: true, id: { not: userId } },
          orderBy: { name: 'asc' },
        })
      : await prisma.user.findMany({
          where: {
            isActive: true,
            id: { not: userId },
            OR: [
              ...(me?.departmentId ? [{ departmentId: me.departmentId }] : []),
              ...(wsIds.length ? [{ workstreamMemberships: { some: { workstreamId: { in: wsIds } } } }] : []),
            ],
          },
          orderBy: { name: 'asc' },
          take: 50,
        });
    teamInfo = collaborators.map(u => `${u.name} (${u.email}) - ${u.role}${u.position ? ', ' + u.position : ''}`).join('\n') || '(no listed colleagues)';

    if (me) {
      userIntro = `## You are talking to
${me.name} (${me.email}) — ${me.role}${me.position ? ', ' + me.position : ''}${me.dept ? `, in department ${me.dept.name}` : ''}.
Their primary workstreams: ${(me.workstreamMemberships || []).map(m => m.workstream.code).join(', ') || '(none)'}.
`;
    }
  } else {
    // Fallback: full context (legacy behaviour)
    const workstreams = await prisma.workstream.findMany({ orderBy: { sortOrder: 'asc' } });
    const users = await prisma.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    wsInfo = workstreams.map(ws => `${ws.code}: ${ws.name}`).join('\n');
    teamInfo = users.map(u => `${u.name} (${u.email}) - ${u.role}, ${u.position || ''}`).join('\n');
  }

  return `You are the AI assistant for GTMS (Geohan Task Management System).

Operating in Malaysia (GMT+8).

${userIntro}## Workstreams (in scope)
${wsInfo}

## Colleagues (people you can assign tasks to)
${teamInfo}

## How to behave
- Be terse. Skip greetings, emojis, bullet menus, and follow-up offers.
- Act, don't ask. Make reasonable assumptions and create the task. Only ask if a required field truly cannot be inferred.
- Match first names to the colleague list. Dates default to DD/MM format. Malaysia working week is Mon–Fri.
- Vague dates: "ASAP"/"today" = today, "tomorrow" = +1 day, "next <weekday>" = the next occurrence of that weekday, "end of month" = last day of current month, "next week" = next Monday.
- "follow up with X" → create a "Waiting On" task assigned to X.
- After creating/updating a task, reply with one short line: \`Created task <id>: <title> (due <date>)\`.

## Task fields
- Type: My Action | Waiting On | Decision | Review | Recurring
- Status: Not Started | In Progress | Waiting On | Blocked | Done | Cancelled
- Priority: Critical | High | Medium | Low (default Medium)

## Recurring
- For weekly recurrence pass recurrenceDays as JSON array (e.g. ["Mon","Wed"]). For monthly: a day number (e.g. "15") or ordinal (e.g. "first_Monday").
- recurrenceInterval handles "every N" patterns. recurrenceEndDate / recurrenceCount cap the run.

## Output rules
- Always include the short task ID (first 6 chars of the UUID).
- When listing tasks: \`[id] title — status — priority — due\`, one per line.`;
}

export interface ChatResult {
  response: string;
  toolCalls?: any[];
  actions?: any[];
}

export async function processChat(
  message: string,
  history: { role: string; content: string }[],
  userId: string,
  user?: AuthUser,
): Promise<ChatResult> {
  if (config.LLM_PROVIDER === 'ollama') {
    return processChatOllama(message, history, userId, user);
  }
  return processChatAnthropic(message, history, userId, user);
}

async function processChatAnthropic(
  message: string,
  history: { role: string; content: string }[],
  userId: string,
  user?: AuthUser,
): Promise<ChatResult> {
  if (!anthropic) {
    return {
      response: 'AI chatbox is not configured. Please set the ANTHROPIC_API_KEY environment variable to enable AI features.',
    };
  }

  const systemPrompt = await buildSystemPrompt(userId);

  // Trim history to the most recent N turns to keep token cost bounded.
  const trimmedHistory = history
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-config.CHAT_HISTORY_LIMIT);

  const messages: Anthropic.MessageParam[] = trimmedHistory
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  messages.push({ role: 'user', content: message });

  const actions: any[] = [];
  const toolCallLog: any[] = [];

  // Cache the static system prompt + tools (cache_control on the static block).
  // The date is appended as a separate, non-cached block so the cache stays valid across days.
  const now = new Date();
  // Express the current date in Malaysia time (GMT+8) — what the model needs for "next Monday" etc.
  const myt = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const dateLine = `Current date/time: ${myt.toISOString().replace('Z', '+08:00')} (Malaysia, ${myt.toUTCString().slice(0, 3)}).`;
  const systemBlocks: Anthropic.TextBlockParam[] = [
    { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: dateLine },
  ];

  let response = await anthropic.messages.create({
    model: config.ANTHROPIC_MODEL,
    max_tokens: config.CHAT_MAX_TOKENS,
    system: systemBlocks,
    tools,
    messages,
  });

  while (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      const result = await executeTool(block.name, block.input, userId, user);
      actions.push({ tool: block.name, input: block.input, result });
      toolCallLog.push({ tool: block.name, input: block.input });
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
    }
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });
    response = await anthropic.messages.create({
      model: config.ANTHROPIC_MODEL,
      max_tokens: config.CHAT_MAX_TOKENS,
      system: systemBlocks,
      tools,
      messages,
    });
  }

  const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === 'text');
  const responseText = textBlocks.map(b => b.text).join('\n');

  return {
    response: responseText,
    toolCalls: toolCallLog.length > 0 ? toolCallLog : undefined,
    actions: actions.length > 0 ? actions : undefined,
  };
}

// Convert Anthropic-style tool definitions to OpenAI/Ollama format
function toolsToOpenAIFormat() {
  return tools.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
}

async function callOllama(messages: OpenAIMessage[]): Promise<{
  message: OpenAIMessage;
  finish_reason: string;
}> {
  const url = `${config.OLLAMA_URL.replace(/\/$/, '')}/v1/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.OLLAMA_MODEL,
      messages,
      tools: toolsToOpenAIFormat(),
      max_tokens: 2048,
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama API error ${res.status}: ${errText.substring(0, 300)}`);
  }
  const data = await res.json() as {
    choices: Array<{ message: OpenAIMessage; finish_reason: string }>;
  };
  if (!data.choices || data.choices.length === 0) {
    throw new Error('Ollama returned no choices');
  }
  return data.choices[0];
}

async function processChatOllama(
  message: string,
  history: { role: string; content: string }[],
  userId: string,
  user?: AuthUser,
): Promise<ChatResult> {
  if (!config.OLLAMA_URL) {
    return { response: 'AI chatbox is not configured. Please set OLLAMA_URL.' };
  }

  const systemPrompt = await buildSystemPrompt(userId);
  const messages: OpenAIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: message },
  ];

  const actions: any[] = [];
  const toolCallLog: any[] = [];
  const MAX_ITERATIONS = 5;
  let iteration = 0;

  while (iteration < MAX_ITERATIONS) {
    iteration++;
    const choice = await callOllama(messages);
    const assistantMsg = choice.message;

    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      messages.push(assistantMsg);
      for (const call of assistantMsg.tool_calls) {
        let parsedInput: any = {};
        try { parsedInput = JSON.parse(call.function.arguments || '{}'); } catch { parsedInput = {}; }
        const result = await executeTool(call.function.name, parsedInput, userId, user);
        actions.push({ tool: call.function.name, input: parsedInput, result });
        toolCallLog.push({ tool: call.function.name, input: parsedInput });
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    return {
      response: assistantMsg.content || '',
      toolCalls: toolCallLog.length > 0 ? toolCallLog : undefined,
      actions: actions.length > 0 ? actions : undefined,
    };
  }

  return {
    response: 'Reached maximum tool iterations without a final response.',
    toolCalls: toolCallLog.length > 0 ? toolCallLog : undefined,
    actions: actions.length > 0 ? actions : undefined,
  };
}
