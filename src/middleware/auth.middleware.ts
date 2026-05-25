import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Rol } from '@prisma/client';
import { config } from '../config';
import { TokenPayload  } from '../auth/auth.types';

// Extiende el tipo Request de Express globalmente
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/** Verifica que el Bearer token sea válido y adjunta el payload a req.user */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, config.JWT_SECRET) as unknown as TokenPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

/**
 * Verifica que req.user tenga uno de los roles permitidos.
 * Uso: router.get('/ruta', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), handler)
 */
export function authorize(...roles: Rol[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    if (!roles.includes(req.user.rol)) {
      res.status(403).json({ error: 'Sin permisos suficientes' });
      return;
    }
    next();
  };
}