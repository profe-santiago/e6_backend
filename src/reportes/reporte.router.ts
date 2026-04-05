import { Router, Request, Response } from 'express';
import { reporteService } from './reporte.service';
import {
  createReporteSchema,
  updateReporteSchema,
  cambiarEstadoSchema,
  idParamSchema,
  filtrosReporteSchema,
} from './reporte.schema';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { optionalAuth } from '../middleware/optional-auth.middleware';

export const reporteRouter = Router();

/**
 * @swagger
 * /api/v1/reportes:
 *   get:
 *     summary: Listar reportes con filtros y paginación (RF-04)
 *     tags: [Reportes]
 *     parameters:
 *       - in: query
 *         name: comunidadId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: categoria
 *         schema:
 *           type: string
 *           enum: [INFRAESTRUCTURA, VIALIDAD, BLOQUEOS, SEGURIDAD]
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [PENDIENTE, EN_PROCESO, RESUELTO, RECHAZADO]
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
 *         description: Lista paginada de reportes
 */
reporteRouter.get('/', optionalAuth, async (req: Request, res: Response) => {
  const parsed = filtrosReporteSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const result = await reporteService.getAll(parsed.data, req.user);
  res.json(result);
});

/**
 * @swagger
 * /api/v1/reportes/{id}:
 *   get:
 *     summary: Obtener detalle de un reporte (RF-03-1)
 *     tags: [Reportes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalle del reporte con historial
 *       404:
 *         description: Reporte no encontrado
 */
reporteRouter.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const reporte = await reporteService.getById(parsed.data.id);
  res.json(reporte);
});

/**
 * @swagger
 * /api/v1/reportes:
 *   post:
 *     summary: Crear un reporte — anónimo o autenticado (RF-02-1, RF-01-1)
 *     tags: [Reportes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [titulo, gravedad, categoria, latitud, longitud, comunidadId]
 *             properties:
 *               titulo:
 *                 type: string
 *                 example: "Bache peligroso en Tinoco y Palacios"
 *               descripcion:
 *                 type: string
 *               gravedad:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               categoria:
 *                 type: string
 *                 enum: [INFRAESTRUCTURA, VIALIDAD, BLOQUEOS, SEGURIDAD]
 *               fuente:
 *                 type: string
 *                 enum: [APP_MOVIL, WEB, TWITTER, FACEBOOK]
 *               latitud:
 *                 type: number
 *               longitud:
 *                 type: number
 *               comunidadId:
 *                 type: integer
 *               fotos:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Reporte creado
 *       429:
 *         description: Límite de reportes anónimos alcanzado (RF-01-3)
 */
reporteRouter.post('/', optionalAuth, async (req: Request, res: Response) => {
  const parsed = createReporteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }

  // Obtiene la IP real del cliente
  const ip = (
    req.headers['x-forwarded-for']?.toString().split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown'
  );

  const reporte = await reporteService.create(parsed.data, req.user, ip);
  res.status(201).json(reporte);
});

/**
 * @swagger
 * /api/v1/reportes/{id}:
 *   patch:
 *     summary: Editar un reporte propio (RF-02-2)
 *     tags: [Reportes]
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
 *               titulo:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               gravedad:
 *                 type: integer
 *               categoria:
 *                 type: string
 *               fotos:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Reporte actualizado
 *       403:
 *         description: Solo puedes editar tus propios reportes
 */
reporteRouter.patch('/:id', authenticate, async (req: Request, res: Response) => {
  const idParsed = idParamSchema.safeParse(req.params);
  if (!idParsed.success) {
    res.status(400).json({ errors: idParsed.error.flatten().fieldErrors });
    return;
  }

  const bodyParsed = updateReporteSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ errors: bodyParsed.error.flatten().fieldErrors });
    return;
  }

  const reporte = await reporteService.update(idParsed.data.id, bodyParsed.data, req.user!);
  res.json(reporte);
});

/**
 * @swagger
 * /api/v1/reportes/{id}:
 *   delete:
 *     summary: Eliminar (soft delete) un reporte propio (RF-02-2)
 *     tags: [Reportes]
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
 *         description: Reporte eliminado
 *       403:
 *         description: Solo puedes eliminar tus propios reportes
 */
reporteRouter.delete('/:id', authenticate, async (req: Request, res: Response) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const result = await reporteService.delete(parsed.data.id, req.user!);
  res.json(result);
});

/**
 * @swagger
 * /api/v1/reportes/{id}/estado:
 *   patch:
 *     summary: Cambiar estado de un reporte (RF-05-7) — autoridades
 *     tags: [Reportes]
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
 *                 enum: [PENDIENTE, EN_PROCESO, RESUELTO, RECHAZADO]
 *               nota:
 *                 type: string
 *     responses:
 *       200:
 *         description: Estado actualizado con entrada en historial
 *       403:
 *         description: Sin permisos suficientes
 */
reporteRouter.patch(
  '/:id/estado',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN', 'COORDINADOR'),
  async (req: Request, res: Response) => {
    const idParsed = idParamSchema.safeParse(req.params);
    if (!idParsed.success) {
      res.status(400).json({ errors: idParsed.error.flatten().fieldErrors });
      return;
    }

    const bodyParsed = cambiarEstadoSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({ errors: bodyParsed.error.flatten().fieldErrors });
      return;
    }

    const reporte = await reporteService.cambiarEstado(
      idParsed.data.id,
      bodyParsed.data,
      req.user!
    );
    res.json(reporte);
  }
);

/**
 * @swagger
 * /api/v1/reportes/{id}/votar:
 *   post:
 *     summary: Votar por un reporte (requiere cuenta)
 *     tags: [Reportes]
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
 *         description: Voto registrado
 *       400:
 *         description: Ya votaste por este reporte
 */
reporteRouter.post('/:id/votar', authenticate, async (req: Request, res: Response) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const result = await reporteService.votar(parsed.data.id, req.user!);
  res.json(result);
});

/**
 * @swagger
 * /api/v1/reportes/{id}/votar:
 *   delete:
 *     summary: Quitar voto de un reporte
 *     tags: [Reportes]
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
 *         description: Voto eliminado
 *       400:
 *         description: No has votado por este reporte
 */
reporteRouter.delete('/:id/votar', authenticate, async (req: Request, res: Response) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const result = await reporteService.quitarVoto(parsed.data.id, req.user!);
  res.json(result);
});