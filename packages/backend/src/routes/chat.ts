import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { validate } from '../middleware/validate';
import { chatMessageSchema } from 'shared';
import { AppError } from '../middleware/error';
import { processChat } from '../services/ai-chat';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// POST /message - send chat message
router.post('/message', validate(chatMessageSchema), asyncHandler(async (req: Request, res: Response) => {
  const { message, sessionId } = req.body;
  const userId = req.user!.id;

  // Get or create session
  let session;
  if (sessionId) {
    session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) throw new AppError(404, 'Session not found');
  } else {
    session = await prisma.chatSession.create({
      data: {
        userId,
        title: message.substring(0, 100),
      },
    });
  }

  // Save user message
  await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      userId,
      role: 'user',
      content: message,
    },
  });

  // Get conversation history
  const history = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  // Process with AI
  const result = await processChat(message, history, userId);

  // Save assistant message
  await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      userId,
      role: 'assistant',
      content: result.response,
      toolCalls: result.toolCalls ? JSON.stringify(result.toolCalls) : null,
      actionTaken: result.actions ? JSON.stringify(result.actions) : null,
    },
  });

  // Update session title from first message
  if (!sessionId) {
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { title: message.substring(0, 100) },
    });
  }

  res.json({
    sessionId: session.id,
    response: result.response,
    actions: result.actions || [],
  });
}));

// GET /sessions - list chat sessions
router.get('/sessions', asyncHandler(async (req: Request, res: Response) => {
  const sessions = await prisma.chatSession.findMany({
    where: { userId: req.user!.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { messages: true } },
    },
    take: 50,
  });

  res.json(sessions);
}));

// GET /sessions/:id - get chat session with messages
router.get('/sessions/:id', asyncHandler(async (req: Request, res: Response) => {
  const session = await prisma.chatSession.findUnique({
    where: { id: req.params.id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!session || session.userId !== req.user!.id) throw new AppError(404, 'Session not found');
  res.json(session);
}));

export default router;
