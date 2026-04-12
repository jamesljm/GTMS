import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../prisma';
import { AppError } from '../middleware/error';
import { getVisibleTaskFilter } from '../middleware/rbac';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// POST / - upload attachment
router.post('/', upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) throw new AppError(400, 'No file uploaded');

  const { taskId } = req.body;
  if (!taskId) throw new AppError(400, 'taskId is required');

  const rbacFilter = await getVisibleTaskFilter(req.user!);
  const task = await prisma.task.findFirst({ where: { AND: [{ id: taskId }, rbacFilter] } });
  if (!task) throw new AppError(404, 'Task not found');

  const attachment = await prisma.attachment.create({
    data: {
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      data: file.buffer,
      taskId,
      uploadedById: req.user!.id,
    },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      size: true,
      createdAt: true,
      uploadedBy: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(attachment);
}));

// GET /:id - download/view attachment
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const attachment = await prisma.attachment.findUnique({
    where: { id: req.params.id },
  });

  if (!attachment) throw new AppError(404, 'Attachment not found');

  // Verify user has access to the parent task
  const rbacFilter = await getVisibleTaskFilter(req.user!);
  const task = await prisma.task.findFirst({ where: { AND: [{ id: attachment.taskId }, rbacFilter] } });
  if (!task) throw new AppError(404, 'Attachment not found');

  res.set({
    'Content-Type': attachment.mimeType,
    'Content-Length': attachment.size.toString(),
    'Content-Disposition': `inline; filename="${attachment.filename}"`,
    'Cache-Control': 'public, max-age=86400',
  });

  res.send(attachment.data);
}));

// DELETE /:id - delete attachment
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const attachment = await prisma.attachment.findUnique({
    where: { id: req.params.id },
    select: { id: true, uploadedById: true },
  });

  if (!attachment) throw new AppError(404, 'Attachment not found');

  // Only the uploader or admin can delete
  if (attachment.uploadedById !== req.user!.id && req.user!.role !== 'SUPER_ADMIN' && req.user!.role !== 'ED') {
    throw new AppError(403, 'Not authorized to delete this attachment');
  }

  await prisma.attachment.delete({ where: { id: req.params.id } });
  res.json({ message: 'Attachment deleted' });
}));

export default router;
