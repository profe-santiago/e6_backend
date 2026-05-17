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

// ─── Rutas específicas ANTES de las dinámicas (:id) ──────────────────────────

/**
 * @swagger
 * /api/v1/cuadrillas/asignaciones/lista:
 *   get:
 *     summary: Listar asignaciones de cuadrilla con filtros
 *     tags: [Cuadrillas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cuadrillaId
 *         schema:
 *           type: integer
 *         description: Filtrar por cuadrilla
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [ASIGNADA, EN_CURSO, COMPLETADA, CANCELADA]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista paginada de asignaciones
 *       401:
 *         description: Token requerido
 *       403:
 *         description: Sin permisos suficientes
 */
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

/**
 * @swagger
 * /api/v1/cuadrillas/asignaciones:
 *   post:
 *     summary: Asignar una cuadrilla a un reporte
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
 *                 example: 1
 *               reporteId:
 *                 type: integer
 *                 example: 42
 *               nota:
 *                 type: string
 *                 example: "Llevar equipo de excavación"
 *     responses:
 *       201:
 *         description: Asignación creada. Si el reporte estaba PENDIENTE pasa automáticamente a EN_PROCESO.
 *       400:
 *         description: Cuadrilla inactiva, reporte ya resuelto/rechazado, o ya tiene asignación activa
 *       403:
 *         description: Sin permisos suficientes
 *       404:
 *         description: Cuadrilla o reporte no encontrado
 *       409:
 *         description: El reporte ya tiene una cuadrilla asignada activa
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
  },
);

/**
 * @swagger
 * /api/v1/cuadrillas/asignaciones/{id}/estado:
 *   patch:
 *     summary: Cambiar el estado de una asignación
 *     tags: [Cuadrillas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estado]
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [ASIGNADA, EN_CURSO, COMPLETADA, CANCELADA]
 *                 example: EN_CURSO
 *               nota:
 *                 type: string
 *                 example: "Cuadrilla en sitio"
 *     responses:
 *       200:
 *         description: Estado actualizado. Si pasa a COMPLETADA el reporte se marca como RESUELTO automáticamente.
 *       400:
 *         description: Asignación ya finalizada (COMPLETADA o CANCELADA)
 *       401:
 *         description: Token requerido
 *       403:
 *         description: Sin permisos suficientes
 *       404:
 *         description: Asignación no encontrada
 */
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

/**
 * @swagger
 * /api/v1/cuadrillas/sugeridas/{municipioId}:
 *   get:
 *     summary: Cuadrillas activas ordenadas por menor carga de trabajo
 *     tags: [Cuadrillas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: municipioId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del municipio
 *     responses:
 *       200:
 *         description: Lista de cuadrillas activas ordenadas por asignaciones activas (menor primero)
 *       400:
 *         description: municipioId inválido
 *       401:
 *         description: Token requerido
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
  },
);

// ─── Cuadrillas ───────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/cuadrillas:
 *   get:
 *     summary: Listar cuadrillas con filtros y paginación
 *     tags: [Cuadrillas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: municipioId
 *         schema:
 *           type: integer
 *         description: Filtrar por municipio (ADMIN ve solo las suyas)
 *       - in: query
 *         name: activa
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado activo/inactivo
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Lista paginada de cuadrillas
 *       401:
 *         description: Token requerido
 *       403:
 *         description: Sin permisos suficientes
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
  },
);

/**
 * @swagger
 * /api/v1/cuadrillas:
 *   post:
 *     summary: Crear una cuadrilla — solo ADMIN o SUPER_ADMIN
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
 *                 example: "Encargada del sector norte del municipio"
 *               municipioId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Cuadrilla creada
 *       400:
 *         description: Datos inválidos
 *       403:
 *         description: Sin permisos suficientes
 *       404:
 *         description: Municipio no encontrado
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
  },
);

// ─── Rutas dinámicas (:id) — siempre al final ─────────────────────────────────

/**
 * @swagger
 * /api/v1/cuadrillas/{id}:
 *   get:
 *     summary: Obtener detalle de una cuadrilla por ID
 *     tags: [Cuadrillas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalle de la cuadrilla con conteo de asignaciones
 *       400:
 *         description: ID inválido
 *       401:
 *         description: Token requerido
 *       404:
 *         description: Cuadrilla no encontrada
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
  },
);

/**
 * @swagger
 * /api/v1/cuadrillas/{id}:
 *   patch:
 *     summary: Actualizar una cuadrilla — solo ADMIN o SUPER_ADMIN
 *     tags: [Cuadrillas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               activa:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Cuadrilla actualizada
 *       400:
 *         description: Datos inválidos o ningún campo enviado
 *       403:
 *         description: Sin permisos suficientes
 *       404:
 *         description: Cuadrilla no encontrada
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
  },
);