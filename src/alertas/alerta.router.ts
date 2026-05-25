import { Router, Request, Response } from 'express';
import { alertaService } from './alerta.service';
import {
  idParamSchema,
  filtrosAlertaSchema,
  asignarAlertaSchema,
  cerrarAlertaSchema,
} from './alerta.schema';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const alertaRouter = Router();

// Todos los endpoints de alertas requieren autenticación
alertaRouter.use(authenticate);

/**
 * @swagger
 * /api/v1/alertas:
 *   get:
 *     summary: Listar alertas con filtros — autoridades
 *     tags: [Alertas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: comunidadId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: nivel
 *         schema:
 *           type: string
 *           enum: [AMARILLA, ROJA]
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [ACTIVA, EN_ATENCION, CERRADA]
 *       - in: query
 *         name: categoria
 *         schema:
 *           type: string
 *           enum: [INFRAESTRUCTURA, VIALIDAD, BLOQUEOS, SEGURIDAD]
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
 *         description: Lista paginada de alertas
 *       403:
 *         description: Sin permisos suficientes
 */
alertaRouter.get(
  '/',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN', 'COORDINADOR', 'USUARIO'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = filtrosAlertaSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const result = await alertaService.getAll(parsed.data, req.user!);
    res.json(result);
  }
);

/**
 * @swagger
 * /api/v1/alertas/{id}:
 *   get:
 *     summary: Obtener detalle de una alerta
 *     tags: [Alertas]
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
 *         description: Detalle de la alerta
 *       404:
 *         description: Alerta no encontrada
 */
alertaRouter.get(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN', 'COORDINADOR', 'USUARIO'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const alerta = await alertaService.getById(parsed.data.id);
    res.json(alerta);
  }
);

/**
 * @swagger
 * /api/v1/alertas/{id}/tomar:
 *   patch:
 *     summary: Tomar una alerta para atenderla
 *     tags: [Alertas]
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
 *         description: Alerta tomada — pasa a EN_ATENCION
 *       400:
 *         description: La alerta no está en estado ACTIVA
 *       403:
 *         description: Sin permisos suficientes
 */
alertaRouter.patch(
  '/:id/tomar',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN', 'COORDINADOR'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const alerta = await alertaService.tomar(parsed.data.id, req.user!);
    res.json(alerta);
  }
);

/**
 * @swagger
 * /api/v1/alertas/{id}/asignar:
 *   patch:
 *     summary: Asignar alerta a un usuario
 *     tags: [Alertas]
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
 *             required: [usuarioId]
 *             properties:
 *               usuarioId:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       200:
 *         description: Alerta asignada
 *       400:
 *         description: Usuario inválido o alerta cerrada
 *       403:
 *         description: Sin permisos suficientes
 *       404:
 *         description: Alerta o usuario no encontrado
 */
alertaRouter.patch(
  '/:id/asignar',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const idParsed = idParamSchema.safeParse(req.params);
    if (!idParsed.success) {
      res.status(400).json({ errors: idParsed.error.flatten().fieldErrors });
      return;
    }
    const bodyParsed = asignarAlertaSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({ errors: bodyParsed.error.flatten().fieldErrors });
      return;
    }
    const alerta = await alertaService.asignar(
      idParsed.data.id,
      bodyParsed.data,
      req.user!
    );
    res.json(alerta);
  }
);

/**
 * @swagger
 * /api/v1/alertas/{id}/cerrar:
 *   patch:
 *     summary: Cerrar una alerta
 *     tags: [Alertas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nota:
 *                 type: string
 *                 example: "Problema resuelto por cuadrilla municipal"
 *     responses:
 *       200:
 *         description: Alerta cerrada
 *       400:
 *         description: La alerta ya está cerrada o no ha sido tomada
 *       403:
 *         description: Sin permisos suficientes
 */
alertaRouter.patch(
  '/:id/cerrar',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN', 'COORDINADOR'),
  async (req: Request, res: Response): Promise<void> => {
    const idParsed = idParamSchema.safeParse(req.params);
    if (!idParsed.success) {
      res.status(400).json({ errors: idParsed.error.flatten().fieldErrors });
      return;
    }
    const bodyParsed = cerrarAlertaSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({ errors: bodyParsed.error.flatten().fieldErrors });
      return;
    }
    const alerta = await alertaService.cerrar(idParsed.data.id, req.user!);
    res.json(alerta);
  }
);