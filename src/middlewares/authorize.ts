import type { Request, Response, NextFunction } from 'express';
import type { Role } from '../lib/auth.js';
import { forbidden, unauthorized } from '../lib/errors.js';

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}
