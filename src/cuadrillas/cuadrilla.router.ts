import { Router, Request, Response } from 'express';
import { cuadrillaService } from './cuadrilla.service';
import {
  idParamSchema,
  asignacionIdParamSchema,
  createCuadrillaSchema,
  updateCuadrillaSchema,
  asignarCuadrillaSchema,
  cambiarEstadoAsignacionSchema,
  filtrosCuadrillaSchema,
  filtrosAsignacionSchema,
} from './cuadrilla.schema';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const cuadrillaRouter = Router();

cuadrillaRouter.use(authenticate);

cuadrillaRouter.get(
  '/asignaciones/lista',
  authorize('SUPER_ADMIN', 'ADMIN', 'COORDINADOR', 'OPERADOR'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = filtrosAsignacionSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const result = await cuadrillaService.getAsignaciones(parsed.data, req.user!);
    res.json(result);
  },
);

cuadrillaRouter.post(
  '/asignaciones',
  authorize('SUPER_ADMIN', 'ADMIN', 'COORDINADOR'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = asignarCuadrillaSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const asignacion = await cuadrillaService.asignar(parsed.data, req.user!);
    res.status(201).json(asignacion);
  },
);

cuadrillaRouter.patch(
  '/asignaciones/:id/estado',
  authorize('SUPER_ADMIN', 'ADMIN', 'COORDINADOR', 'OPERADOR'),
  async (req: Request, res: Response): Promise<void> => {
    const idParsed = idParamSchema.safeParse(req.params);
    if (!idParsed.success) {
      res.status(400).json({ errors: idParsed.error.flatten().fieldErrors });
      return;
    }
    const bodyParsed = cambiarEstadoAsignacionSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({ errors: bodyParsed.error.flatten().fieldErrors });
      return;
    }
    const result = await cuadrillaService.cambiarEstadoAsignacion(
      idParsed.data.id,
      bodyParsed.data,
      req.user!,
    );
    res.json(result);
  },
);

cuadrillaRouter.get(
  '/sugeridas/:municipioId',
  authorize('SUPER_ADMIN', 'ADMIN', 'COORDINADOR'),
  async (req: Request, res: Response): Promise<void> => {
    const municipioId = parseInt(String(req.params.municipioId), 10);
    if (isNaN(municipioId)) {
      res.status(400).json({ error: 'municipioId inválido' });
      return;
    }
    const sugeridas = await cuadrillaService.getSugeridas(municipioId);
    res.json(sugeridas);
  },
);

// ─── Rutas de cuadrillas generales ──────────────────────────────────────────

cuadrillaRouter.get(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN', 'COORDINADOR'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = filtrosCuadrillaSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const result = await cuadrillaService.getAll(parsed.data, req.user!);
    res.json(result);
  },
);

cuadrillaRouter.post(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = createCuadrillaSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const cuadrilla = await cuadrillaService.create(parsed.data, req.user!);
    res.status(201).json(cuadrilla);
  },
);

// ─── Rutas dinámicas (:id) — siempre al final ────────────────────────────────

cuadrillaRouter.get(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN', 'COORDINADOR'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const cuadrilla = await cuadrillaService.getById(parsed.data.id);
    res.json(cuadrilla);
  },
);

cuadrillaRouter.patch(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const idParsed = idParamSchema.safeParse(req.params);
    if (!idParsed.success) {
      res.status(400).json({ errors: idParsed.error.flatten().fieldErrors });
      return;
    }
    const bodyParsed = updateCuadrillaSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({ errors: bodyParsed.error.flatten().fieldErrors });
      return;
    }
    const cuadrilla = await cuadrillaService.update(idParsed.data.id, bodyParsed.data, req.user!);
    res.json(cuadrilla);
  },
);