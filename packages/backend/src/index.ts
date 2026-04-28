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
import workstreamMemberRoutes from './routes/workstream-members';
import m365Routes from './routes/m365';
import preferencesRoutes from './routes/preferences';

// Workers
import { startWorkers, setupRecurringJobs, getRedisStatus } from './services/workers';

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
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    redis: getRedisStatus(),
  });
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
app.use('/api/v1/workstreams/:id/members', authenticate, workstreamMemberRoutes);
app.use('/api/v1/m365', authenticate, m365Routes);
app.use('/api/v1/preferences', authenticate, preferencesRoutes);
app.use('/api/v1/webhooks', webhookRoutes); // No auth for webhooks

// Admin endpoints
app.get('/api/v1/admin/db-url', authenticate, (req, res) => {
  if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ED') {
    res.status(403).json({ error: 'Only ED or SUPER_ADMIN can access database URL' });
    return;
  }
  res.json({ url: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL || '' });
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
