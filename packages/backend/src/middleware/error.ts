import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  console.error('Error:', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    const e = err as Error & { code?: string; meta?: { target?: string[] | string; modelName?: string } };
    if (e.code === 'P2002') {
      const target = Array.isArray(e.meta?.target) ? e.meta?.target.join(', ') : e.meta?.target;
      res.status(400).json({ error: `A record with this ${target || 'value'} already exists` });
      return;
    }
    if (e.code === 'P2025') {
      res.status(404).json({ error: 'Record not found' });
      return;
    }
    if (e.code === 'P2003') {
      res.status(400).json({ error: 'Referenced record does not exist or is in use' });
      return;
    }
    res.status(400).json({ error: 'Database operation failed' });
    return;
  }

  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}
