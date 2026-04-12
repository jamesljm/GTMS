import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { prisma } from './prisma';
import { errorHandler } from './middleware/error';
import { authenticate } from './middleware/auth';

// Routes
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import noteRoutes from './routes/notes';
import dashboardRoutes from './routes/dashboard';
import workstreamRoutes from './routes/workstreams';
import userRoutes from './routes/users';
import chatRoutes from './routes/chat';
import attachmentRoutes from './routes/attachments';
import departmentRoutes from './routes/departments';
import webhookRoutes from './routes/webhooks';
import assignmentRoutes from './routes/assignments';
import exportRoutes from './routes/export';
import notificationRoutes from './routes/notifications';
import auditRoutes from './routes/audit';

// Workers
import { startWorkers, setupRecurringJobs } from './services/workers';

const app = express();

// Trust proxy (Render uses a reverse proxy)
app.set('trust proxy', 1);

// Global middleware
app.use(helmet());
app.use(cors({
  origin: config.CORS_ORIGIN.split(',').map(s => s.trim()),
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/signup', authLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tasks', authenticate, taskRoutes);
app.use('/api/v1/notes', authenticate, noteRoutes);
app.use('/api/v1/dashboard', authenticate, dashboardRoutes);
app.use('/api/v1/workstreams', authenticate, workstreamRoutes);
app.use('/api/v1/users', authenticate, userRoutes);
app.use('/api/v1/chat', authenticate, chatRoutes);
app.use('/api/v1/attachments', authenticate, attachmentRoutes);
app.use('/api/v1/departments', authenticate, departmentRoutes);
app.use('/api/v1/users/:userId/assignments', authenticate, assignmentRoutes);
app.use('/api/v1/export', authenticate, exportRoutes);
app.use('/api/v1/notifications', authenticate, notificationRoutes);
app.use('/api/v1/audit-logs', authenticate, auditRoutes);
app.use('/api/v1/webhooks', webhookRoutes); // No auth for webhooks

// Admin endpoints
app.get('/api/v1/admin/db-url', authenticate, (req, res) => {
  if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ED') {
    res.status(403).json({ error: 'Only ED or SUPER_ADMIN can access database URL' });
    return;
  }
  res.json({ url: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL || '' });
});

// TEMPORARY: Emergency password reset (no auth required, one-time use)
app.post('/api/v1/admin/emergency-reset', async (req, res) => {
  try {
    const { email, password, secret } = req.body;
    if (secret !== 'gtms-cleanup-2026') {
      res.status(403).json({ error: 'Invalid secret' });
      return;
    }
    if (!email || !password) {
      res.status(400).json({ error: 'email and password required' });
      return;
    }
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });
    res.json({ ok: true, email: user.email, name: user.name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// TEMPORARY: Cleanup endpoint - delete all tasks and users except specified email
app.post('/api/v1/admin/cleanup', authenticate, async (req, res) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ED') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const keepEmail = req.body.keepEmail;
    if (!keepEmail) {
      res.status(400).json({ error: 'keepEmail is required' });
      return;
    }

    // Find user to keep
    const keepUser = await prisma.user.findUnique({ where: { email: keepEmail } });
    if (!keepUser) {
      res.status(404).json({ error: `User ${keepEmail} not found` });
      return;
    }

    const results: Record<string, number> = {};

    // 1. Delete all task proposals
    const proposals = await prisma.taskProposal.deleteMany({});
    results.taskProposals = proposals.count;

    // 2. Delete all notes
    const notes = await prisma.note.deleteMany({});
    results.notes = notes.count;

    // 3. Delete all attachments
    const attachments = await prisma.attachment.deleteMany({});
    results.attachments = attachments.count;

    // 4. Delete all notifications
    const notifications = await prisma.notification.deleteMany({});
    results.notifications = notifications.count;

    // 5. Delete all audit logs
    const auditLogs = await prisma.auditLog.deleteMany({});
    results.auditLogs = auditLogs.count;

    // 6. Delete all reminder logs
    const reminderLogs = await prisma.reminderLog.deleteMany({});
    results.reminderLogs = reminderLogs.count;

    // 7. Clear parentId on all tasks (break self-references)
    await prisma.task.updateMany({ data: { parentId: null } });

    // 8. Delete all tasks
    const tasks = await prisma.task.deleteMany({});
    results.tasks = tasks.count;

    // 9. Delete all chat messages and sessions
    const chatMessages = await prisma.chatMessage.deleteMany({});
    results.chatMessages = chatMessages.count;
    const chatSessions = await prisma.chatSession.deleteMany({});
    results.chatSessions = chatSessions.count;

    // 10. Delete all assignments for users being deleted
    const assignments = await prisma.userAssignment.deleteMany({
      where: { userId: { not: keepUser.id } },
    });
    results.assignments = assignments.count;

    // 11. Clear department headId references
    await prisma.department.updateMany({
      where: { headId: { not: keepUser.id } },
      data: { headId: null },
    });

    // 12. Delete all users except keepUser
    const users = await prisma.user.deleteMany({
      where: { id: { not: keepUser.id } },
    });
    results.usersDeleted = users.count;

    res.json({ ok: true, kept: keepEmail, results });
  } catch (err: any) {
    console.error('Cleanup error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Error handler
app.use(errorHandler);

// Start server
async function main() {
  try {
    await prisma.$connect();
    console.log('Database connected');

    // Start BullMQ workers
    try {
      startWorkers();
      await setupRecurringJobs();
    } catch (err) {
      console.warn('Redis/BullMQ not available, workers disabled:', (err as Error).message);
    }

    app.listen(config.PORT, () => {
      console.log(`GTMS backend running on port ${config.PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();
