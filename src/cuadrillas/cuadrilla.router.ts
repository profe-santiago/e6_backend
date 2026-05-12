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

// ─── Cuadrillas ──────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/cuadrillas:
 *   get:
 *     summary: Listar cuadrillas
 *     tags: [Cuadrillas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: municipioId
 *         schema: { type: integer }
 *       - in: query
 *         name: activa
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Lista paginada de cuadrillas con carga de trabajo
 */
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
  }
);

/**
 * @swagger
 * /api/v1/cuadrillas/sugeridas/{municipioId}:
 *   get:
 *     summary: Cuadrillas ordenadas por disponibilidad (menos carga primero)
 *     tags: [Cuadrillas]
 *     security:
 *       - bearerAuth: []
 */
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
  }
);

// ─── Asignaciones ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/cuadrillas/asignaciones:
 *   get:
 *     summary: Listar asignaciones con filtros
 *     tags: [Cuadrillas]
 */
cuadrillaRouter.get(
  '/asignaciones/lista',
  authorize('SUPER_ADMIN', 'ADMIN', 'COORDINADOR'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = filtrosAsignacionSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const result = await cuadrillaService.getAsignaciones(parsed.data, req.user!);
    res.json(result);
  }
);

/**
 * @swagger
 * /api/v1/cuadrillas/{id}:
 *   get:
 *     summary: Obtener cuadrilla por ID
 *     tags: [Cuadrillas]
 */
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
  }
);

/**
 * @swagger
 * /api/v1/cuadrillas:
 *   post:
 *     summary: Crear cuadrilla
 *     tags: [Cuadrillas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, municipioId]
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Cuadrilla Norte"
 *               descripcion:
 *                 type: string
 *                 example: "Atiende zona norte de la ciudad"
 *               municipioId:
 *                 type: integer
 *                 example: 1
 */
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
  }
);

/**
 * @swagger
 * /api/v1/cuadrillas/{id}:
 *   patch:
 *     summary: Actualizar cuadrilla (nombre, descripción, activar/desactivar)
 *     tags: [Cuadrillas]
 */
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
  }
);

/**
 * @swagger
 * /api/v1/cuadrillas/asignaciones:
 *   post:
 *     summary: Asignar cuadrilla a un reporte
 *     tags: [Cuadrillas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cuadrillaId, reporteId]
 *             properties:
 *               cuadrillaId:
 *                 type: integer
 *               reporteId:
 *                 type: integer
 *               nota:
 *                 type: string
 */
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
  }
);

/**
 * @swagger
 * /api/v1/cuadrillas/asignaciones/{id}/estado:
 *   patch:
 *     summary: Cambiar estado de asignación (EN_CURSO, COMPLETADA, CANCELADA)
 *     tags: [Cuadrillas]
 */
cuadrillaRouter.patch(
  '/asignaciones/:id/estado',
  authorize('SUPER_ADMIN', 'ADMIN', 'COORDINADOR'),
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
      req.user!
    );
    res.json(result);
  }
);