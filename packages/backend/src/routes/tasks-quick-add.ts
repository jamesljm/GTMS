import { Router, Request, Response, NextFunction } from 'express';
import * as chrono from 'chrono-node';
import { z } from 'zod';
import { prisma } from '../prisma';
import { createNotification } from './notifications';
import { createAuditLog } from './audit';

const router = Router();

const inputSchema = z.object({
  text: z.string().min(1).max(500),
  dryRun: z.boolean().optional().default(false),
});

type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
type RecurrenceType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

interface UserLite { id: string; name: string; email: string; }
interface WorkstreamLite { id: string; code: string; name: string; color: string; }

interface ParseResult {
  title: string;
  description: string | null;
  startDate: Date | null;
  dueDate: Date | null;
  priority: Priority;
  type: 'My Action' | 'Recurring';
  workstream: WorkstreamLite | null;
  assignee: UserLite | null;
  recurrenceType: RecurrenceType | null;
}

// Escape regex special characters so user input (names, codes) can be embedded safely
function reEscape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Pre-process common office abbreviations into phrases chrono understands
function expandAbbreviations(text: string): string {
  // Order: longer/more specific first
  const replacements: Array<[RegExp, string]> = [
    [/\bEOD\b/gi, 'today at 5pm'],
    [/\bBOD\b/gi, 'today at 9am'],
    [/\bEOW\b/gi, 'this Friday at 5pm'],
    [/\bBOW\b/gi, 'next Monday at 9am'],
    [/\bEOM\b/gi, 'end of this month'],
    [/\bBOM\b/gi, 'first of next month at 9am'],
    [/\bEOY\b/gi, 'December 31 at 5pm'],
    [/\bASAP\b/gi, ''], // priority handled separately; remove the noise
  ];
  let out = text;
  for (const [pattern, replacement] of replacements) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

// Strip a matched substring from text and collapse adjacent whitespace
function strip(text: string, match: string): string {
  return text.replace(match, ' ').replace(/\s+/g, ' ').trim();
}

function parsePriority(text: string): { priority: Priority; remaining: string } {
  // Order matters: most specific first
  const patterns: Array<[RegExp, Priority]> = [
    [/\b(urgent|asap|critical|blocker|blocking|must\s+do(?:\s+today)?|p0)\b/i, 'Critical'],
    [/\b(high\s+priority|high\s*-?\s*priority|important|p1)\b/i, 'High'],
    [/\b(p2|medium\s+priority)\b/i, 'Medium'],
    [/\b(low\s+priority|low\s*-?\s*priority|whenever|someday|nice\s+to\s+have|p3)\b/i, 'Low'],
  ];
  for (const [pattern, priority] of patterns) {
    const m = text.match(pattern);
    if (m) return { priority, remaining: strip(text, m[0]) };
  }
  return { priority: 'Medium', remaining: text };
}

function parseWorkstream(text: string, workstreams: WorkstreamLite[]): { workstream: WorkstreamLite | null; remaining: string } {
  // Pattern 1: #CODE (e.g. #IT, #FIN) — explicit
  const hashMatch = text.match(/#([A-Z]{2,5})\b/i);
  if (hashMatch) {
    const code = hashMatch[1].toUpperCase();
    const ws = workstreams.find(w => w.code === code);
    if (ws) return { workstream: ws, remaining: strip(text, hashMatch[0]) };
  }
  // Pattern 2: "in/for/on <CODE>" — preposition + code
  for (const ws of workstreams) {
    const pattern = new RegExp(`\\b(?:in|for|on)\\s+${reEscape(ws.code)}\\b`, 'i');
    const m = text.match(pattern);
    if (m) return { workstream: ws, remaining: strip(text, m[0]) };
  }
  // Pattern 3: bare code on its own as a token (e.g. "Review IT budget")
  // Only match exactly the code, not arbitrary substrings
  for (const ws of workstreams) {
    const pattern = new RegExp(`\\b${reEscape(ws.code)}\\b`);
    const m = text.match(pattern);
    if (m) return { workstream: ws, remaining: strip(text, m[0]) };
  }
  return { workstream: null, remaining: text };
}

function parseAssignee(text: string, users: UserLite[]): { assignee: UserLite | null; remaining: string } {
  // Pattern: @firstname or @firstname.lastname
  const atMatch = text.match(/@([a-z][a-z0-9._-]*)/i);
  if (atMatch) {
    const tag = atMatch[1].toLowerCase();
    const found = users.find(u =>
      u.email.toLowerCase().startsWith(tag + '@') ||
      u.name.toLowerCase().split(' ').some(part => part.toLowerCase() === tag) ||
      u.name.toLowerCase().replace(/\s+/g, '.') === tag,
    );
    if (found) return { assignee: found, remaining: strip(text, atMatch[0]) };
    // Tag was used but didn't match a user — still strip it from title
    return { assignee: null, remaining: strip(text, atMatch[0]) };
  }
  // Pattern: "to/for/assign to <Full Name>" — try full name first (longer wins)
  // Sort by name length DESC so multi-word names are checked before first-name-only matches
  const sortedUsers = [...users].sort((a, b) => b.name.length - a.name.length);
  for (const u of sortedUsers) {
    const escapedFull = reEscape(u.name);
    const pattern = new RegExp(`\\b(?:assign(?:ed)?\\s+to|to|for)\\s+${escapedFull}\\b`, 'i');
    const m = text.match(pattern);
    if (m) return { assignee: u, remaining: strip(text, m[0]) };
  }
  // Pattern: "to/for <Firstname>" — fallback to first name
  for (const u of users) {
    const firstName = u.name.split(' ')[0];
    if (firstName.length < 2) continue;
    const pattern = new RegExp(`\\b(?:assign(?:ed)?\\s+to|to|for)\\s+${reEscape(firstName)}\\b`, 'i');
    const m = text.match(pattern);
    if (m) return { assignee: u, remaining: strip(text, m[0]) };
  }
  return { assignee: null, remaining: text };
}

function parseRecurrence(text: string): { recurrenceType: RecurrenceType | null; remaining: string } {
  const patterns: Array<[RegExp, RecurrenceType]> = [
    [/\bevery\s+(?:other\s+week|two\s+weeks|2\s+weeks|fortnight)\b/i, 'biweekly'],
    [/\bevery\s+other\s+(?:mon|tues|wednes|thurs|fri|satur|sun)day\b/i, 'biweekly'],
    [/\b(biweekly|fortnightly)\b/i, 'biweekly'],
    [/\b(daily|every\s+day|every\s+weekday|each\s+day)\b/i, 'daily'],
    [/\btwice\s+a\s+week\b/i, 'weekly'],
    [/\b(weekly|every\s+week|every\s+(?:mon|tues|wednes|thurs|fri|satur|sun)day)\b/i, 'weekly'],
    [/\b(monthly|every\s+month|each\s+month)\b/i, 'monthly'],
    [/\b(quarterly|every\s+quarter)\b/i, 'quarterly'],
    [/\b(yearly|annually|every\s+year)\b/i, 'yearly'],
  ];
  for (const [pattern, type] of patterns) {
    const m = text.match(pattern);
    if (m) {
      // For "every Monday" we keep the day so chrono can still parse next Monday — only strip the "every" wrapper
      if (type === 'weekly' && /every\s+\w+day/i.test(m[0])) {
        const stripped = text.replace(/\bevery\s+/i, '').trim();
        return { recurrenceType: type, remaining: stripped };
      }
      return { recurrenceType: type, remaining: strip(text, m[0]) };
    }
  }
  return { recurrenceType: null, remaining: text };
}

// "for 3 days" / "for a week" — duration after a start date implies dueDate = start + duration
function parseDuration(text: string): { days: number | null; remaining: string } {
  const m = text.match(/\bfor\s+(?:(\d+|a|an|one|two|three|four|five|six|seven)\s+)?(day|days|week|weeks|month|months)\b/i);
  if (!m) return { days: null, remaining: text };
  const wordToNum: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
  const numStr = (m[1] || '1').toLowerCase();
  const n = wordToNum[numStr] ?? parseInt(numStr, 10);
  const unit = m[2].toLowerCase();
  const days = unit.startsWith('week') ? n * 7 : unit.startsWith('month') ? n * 30 : n;
  return { days, remaining: strip(text, m[0]) };
}

// "Title: description" or "Title — description" splits into title + description
function splitTitleAndDescription(text: string): { title: string; description: string | null } {
  const match = text.match(/^(.+?)\s*[:—–-]{1,2}\s+(.+)$/);
  if (match && match[1].length >= 3 && match[2].length >= 3) {
    return { title: match[1].trim(), description: match[2].trim() };
  }
  return { title: text, description: null };
}

function parseDateAndStrip(text: string, refDate: Date): { startDate: Date | null; dueDate: Date | null; remaining: string } {
  const results = chrono.casual.parse(text, refDate, { forwardDate: true });
  if (results.length === 0) return { startDate: null, dueDate: null, remaining: text };

  const first = results[0];
  let startDate: Date | null = null;
  let dueDate: Date | null = null;

  if (first.end) {
    // Range: "from Monday to Thursday", "1st to 3rd"
    startDate = first.start.date();
    dueDate = first.end.date();
    if (!first.start.isCertain('hour')) startDate.setHours(9, 0, 0, 0);
    if (!first.end.isCertain('hour')) dueDate.setHours(17, 0, 0, 0);
  } else {
    // Single date — interpret as due date only
    dueDate = first.start.date();
    if (!first.start.isCertain('hour')) dueDate.setHours(17, 0, 0, 0);
  }

  let remaining = strip(text, first.text);

  // Look for additional date results — e.g. "Friday at 3pm" + "starting Monday"
  // The second result, if present and the first didn't include a range, becomes the start date
  if (!first.end && results.length > 1) {
    const second = results[1];
    const secondText = second.text.toLowerCase();
    // Only treat as start date if it's preceded by "starting", "from", "begin"
    const startPattern = new RegExp(`\\b(starting|from|begin(?:ning)?)\\s+${second.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (startPattern.test(text)) {
      startDate = second.start.date();
      if (!second.start.isCertain('hour')) startDate.setHours(9, 0, 0, 0);
      remaining = strip(remaining, second.text);
    }
  }

  return { startDate, dueDate, remaining };
}

function parseQuickAdd(text: string, users: UserLite[], workstreams: WorkstreamLite[]): ParseResult {
  // Expand office abbreviations (EOD, EOW, etc.) so chrono understands them
  let remaining = expandAbbreviations(text.trim());
  const { priority, remaining: r1 } = parsePriority(remaining);
  remaining = r1;
  const { workstream, remaining: r2 } = parseWorkstream(remaining, workstreams);
  remaining = r2;
  const { assignee, remaining: r3 } = parseAssignee(remaining, users);
  remaining = r3;
  const { recurrenceType, remaining: r4 } = parseRecurrence(remaining);
  remaining = r4;
  let { startDate, dueDate, remaining: r5 } = parseDateAndStrip(remaining, new Date());
  remaining = r5;
  // Duration ("for 3 days") — if start exists but no due, derive due. If neither, treat duration as starting today.
  const { days, remaining: r6 } = parseDuration(remaining);
  remaining = r6;
  if (days !== null) {
    if (startDate && !dueDate) {
      dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + days);
      dueDate.setHours(17, 0, 0, 0);
    } else if (!startDate && !dueDate) {
      const now = new Date();
      startDate = new Date(now);
      startDate.setHours(9, 0, 0, 0);
      dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + days);
      dueDate.setHours(17, 0, 0, 0);
    } else if (dueDate && !startDate) {
      // "Submit report by Friday for 3 days" → start = due - days
      startDate = new Date(dueDate);
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(9, 0, 0, 0);
    }
  }

  // What's left becomes the title. Trim filler words and punctuation.
  let leftover = remaining
    .replace(/\b(by|on|at|due|starting|begin(?:ning)?|from|to|on)\b/gi, ' ')
    .replace(/[,;]+\s*$/g, '')
    .replace(/^[,;]+\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into title + description if a colon/dash separator is present
  const { title, description } = splitTitleAndDescription(leftover);

  return {
    title: title || text.trim().slice(0, 80),
    description,
    startDate,
    dueDate,
    priority,
    type: recurrenceType ? 'Recurring' : 'My Action',
    workstream,
    assignee,
    recurrenceType,
  };
}

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { text, dryRun } = inputSchema.parse(req.body);

    const [workstreams, users] = await Promise.all([
      prisma.workstream.findMany({ select: { id: true, code: true, name: true, color: true } }),
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, email: true },
      }),
    ]);

    const parsed = parseQuickAdd(text, users, workstreams);

    const preview = {
      title: parsed.title,
      description: parsed.description,
      startDate: parsed.startDate ? parsed.startDate.toISOString() : null,
      dueDate: parsed.dueDate ? parsed.dueDate.toISOString() : null,
      priority: parsed.priority,
      type: parsed.type,
      workstream: parsed.workstream,
      assignee: parsed.assignee,
      recurrenceType: parsed.recurrenceType,
    };

    if (dryRun) {
      res.json({ preview });
      return;
    }

    const assigneeId = parsed.assignee?.id ?? null;
    const workstreamId = parsed.workstream?.id ?? null;
    const acceptanceStatus = (assigneeId && assigneeId !== userId) ? 'Pending' : 'Accepted';

    const task = await prisma.task.create({
      data: {
        title: parsed.title,
        description: parsed.description,
        type: parsed.type,
        priority: parsed.priority,
        status: 'Not Started',
        source: 'Manual',
        startDate: parsed.startDate,
        dueDate: parsed.dueDate,
        workstreamId,
        assigneeId,
        createdById: userId,
        acceptanceStatus,
        recurrenceType: parsed.recurrenceType,
      },
      include: {
        workstream: { select: { id: true, code: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    if (acceptanceStatus === 'Pending' && assigneeId) {
      prisma.taskProposal
        .create({
          data: {
            taskId: task.id,
            proposerId: userId,
            action: 'PROPOSED',
            proposedTitle: parsed.title,
          },
        })
        .catch(err => console.error('quick-add proposal failed:', err.message));
      createNotification(
        assigneeId,
        'TASK_ASSIGNED',
        'New task assigned',
        `You have been assigned: ${parsed.title}`,
        task.id,
      ).catch(err => console.error('quick-add notification failed:', err.message));
    }

    createAuditLog(userId, 'task.created', task.id, {
      title: parsed.title,
      source: 'QuickAdd',
    }).catch(err => console.error('quick-add audit failed:', err.message));

    res.json({ task, preview });
  } catch (err) {
    next(err);
  }
});

export default router;
