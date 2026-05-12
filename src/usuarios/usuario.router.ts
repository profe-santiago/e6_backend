import { Router, Request, Response } from 'express';
import { usuarioService } from './usuario.service';
import {
  createAdminSchema,
  createCoordinadorSchema,
  createOperadorSchema,
  idParamSchema,
  filtrosUsuarioSchema,
} from './usuario.schema';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const usuarioRouter = Router();

usuarioRouter.use(authenticate);

usuarioRouter.get('/perfil', async (req: Request, res: Response): Promise<void> => {
  const perfil = await usuarioService.getPerfil(req.user!.sub);
  res.json(perfil);
});

usuarioRouter.get(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN', 'COORDINADOR'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = filtrosUsuarioSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const result = await usuarioService.getAll(parsed.data, req.user!);
    res.json(result);
  }
);

usuarioRouter.get(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const usuario = await usuarioService.getById(parsed.data.id);
    res.json(usuario);
  }
);

usuarioRouter.post(
  '/admin',
  authorize('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = createAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const usuario = await usuarioService.createAdmin(parsed.data, req.user!);
    res.status(201).json(usuario);
  }
);

usuarioRouter.post(
  '/coordinador',
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = createCoordinadorSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const usuario = await usuarioService.createCoordinador(parsed.data, req.user!);
    res.status(201).json(usuario);
  }
);

/**
 * POST /api/v1/usuarios/operador
 * Crea un usuario OPERADOR de cuadrilla — solo ADMIN o SUPER_ADMIN
 */
usuarioRouter.post(
  '/operador',
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = createOperadorSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const usuario = await usuarioService.createOperador(parsed.data, req.user!);
    res.status(201).json(usuario);
  }
);

usuarioRouter.patch(
  '/:id/desactivar',
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const usuario = await usuarioService.desactivar(parsed.data.id, req.user!);
    res.json(usuario);
  }
);

usuarioRouter.patch(
  '/:id/activar',
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const usuario = await usuarioService.activar(parsed.data.id, req.user!);
    res.json(usuario);
  }
);