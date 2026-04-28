import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { validate } from '../middleware/validate';
import { updatePreferencesSchema } from 'shared';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// GET / - get current user's preferences (upsert with defaults)
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const preference = await prisma.userPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  res.json(preference);
}));

// PATCH / - update current user's preferences
router.patch('/', validate(updatePreferencesSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const data = req.body;

  const preference = await prisma.userPreference.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  res.json(preference);
}));

export default router;
