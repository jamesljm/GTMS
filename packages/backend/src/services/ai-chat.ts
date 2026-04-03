import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { prisma } from '../prisma';

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

async function executeTool(name: string, input: any, userId: string): Promise<any> {
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

      const task = await prisma.task.create({
        data: {
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
        },
        include: { workstream: true, assignee: { select: { name: true, email: true } } },
      });
      return { action: 'created', task: { id: task.id, title: task.title, priority: task.priority, workstream: task.workstream?.code, assignee: task.assignee?.name, dueDate: task.dueDate } };
    }

    case 'update_task': {
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
        if (user) data.assigneeId = user.id;
      }

      const task = await prisma.task.update({
        where: { id: input.taskId },
        data,
        include: { workstream: true, assignee: { select: { name: true } } },
      });
      return { action: 'updated', task: { id: task.id, title: task.title, status: task.status, priority: task.priority } };
    }

    case 'query_tasks': {
      const where: any = { status: { notIn: ['Done', 'Cancelled'] } };
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
        const user = await prisma.user.findUnique({ where: { email: input.assigneeEmail } });
        assigneeId = user?.id || null;
      }

      const parent = await prisma.task.findUnique({ where: { id: input.parentId } });
      if (!parent) return { error: 'Parent task not found' };

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
      const data: any = {};
      if (input.status) {
        data.status = input.status;
        if (input.status === 'Done') data.completedAt = new Date();
      }
      if (input.priority) data.priority = input.priority;

      const result = await prisma.task.updateMany({
        where: { id: { in: input.taskIds } },
        data,
      });
      return { action: 'bulk_updated', count: result.count, status: input.status, priority: input.priority };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function buildSystemPrompt(): Promise<string> {
  const workstreams = await prisma.workstream.findMany({ orderBy: { sortOrder: 'asc' } });
  const users = await prisma.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });

  const now = new Date();
  const wsInfo = workstreams.map(ws => `${ws.code}: ${ws.name}`).join('\n');
  const teamInfo = users.map(u => `${u.name} (${u.email}) - ${u.role}, ${u.position || ''}, ${u.department || ''}`).join('\n');

  return `You are the AI assistant for GTMS (Geohan Task Management System), built for the Executive Director of Geohan Corporation, a Malaysian listed geotechnical contractor (~750 staff, 35+ sites).

Current date/time: ${now.toISOString()} (Malaysia, GMT+8)

## Workstreams
${wsInfo}

## Team Members
${teamInfo}

## Your Role
- Help the ED manage 100+ tasks across 15 workstreams
- Create, update, and query tasks using the available tools
- Be concise and action-oriented
- Use Malaysian business context (e.g., "end of month" = last working day, dates are DD/MM format by default)
- When the user mentions a person by first name, match to the team member list
- When the user says "follow up with X", create a "Waiting On" type task
- When the user says "remind me" or "check on", use appropriate due dates
- Interpret vague dates: "ASAP" = today/tomorrow, "next week" = Monday, "end of month" = last day of current month, "Q2" = end of June
- Always confirm actions taken with a brief summary

## Task Fields
- Type: My Action (ED's own todo), Waiting On (someone else needs to act), Decision (needs decision), Review (needs review), Recurring (periodic)
- Status: Not Started, In Progress, Waiting On, Blocked, Done, Cancelled
- Priority: Critical, High, Medium, Low

## Guidelines
- If the user's intent is ambiguous, ask for clarification
- For queries, show results in a clean format
- When creating tasks, infer the workstream from context if not specified
- Always include the task ID in responses for reference`;
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
): Promise<ChatResult> {
  if (!anthropic) {
    return {
      response: 'AI chatbox is not configured. Please set the ANTHROPIC_API_KEY environment variable to enable AI features.',
    };
  }

  const systemPrompt = await buildSystemPrompt();

  // Build messages from history
  const messages: Anthropic.MessageParam[] = history
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  // Add current message
  messages.push({ role: 'user', content: message });

  const actions: any[] = [];
  const toolCallLog: any[] = [];

  // Call Claude with tools
  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    system: systemPrompt,
    tools,
    messages,
  });

  // Process tool use blocks iteratively
  while (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      const result = await executeTool(block.name, block.input, userId);
      actions.push({ tool: block.name, input: block.input, result });
      toolCallLog.push({ tool: block.name, input: block.input });
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }

    // Continue conversation with tool results
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: systemPrompt,
      tools,
      messages,
    });
  }

  // Extract text from final response
  const textBlocks = response.content.filter(
    (b): b is Anthropic.TextBlock => b.type === 'text'
  );
  const responseText = textBlocks.map(b => b.text).join('\n');

  return {
    response: responseText,
    toolCalls: toolCallLog.length > 0 ? toolCallLog : undefined,
    actions: actions.length > 0 ? actions : undefined,
  };
}
