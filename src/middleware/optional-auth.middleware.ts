import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload } from '../auth/auth.types';

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const token = header.split(' ')[1];
      req.user = jwt.verify(token, config.JWT_SECRET) as unknown as JwtPayload;
    } catch {
      // Token inválido — se ignora, sigue como anónimo
    }
  }
  next();
}