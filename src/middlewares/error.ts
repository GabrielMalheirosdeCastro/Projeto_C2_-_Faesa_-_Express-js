import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/errors.js';

 
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(422).json({
      error: 'Erro de validação',
      details: err.flatten(),
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }
   
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
}
