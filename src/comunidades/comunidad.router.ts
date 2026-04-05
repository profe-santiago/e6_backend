import { Router, Request, Response } from 'express';
import { comunidadService } from './comunidad.service';
import {
  slugParamSchema,
  createComunidadSchema,
  updateComunidadSchema,
  filtrosComunidadSchema,
} from './comunidad.schema';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const comunidadRouter = Router();

/**
 * @swagger
 * /api/v1/comunidades:
 *   get:
 *     summary: Listar comunidades con filtros y paginación
 *     tags: [Comunidades]
 *     parameters:
 *       - in: query
 *         name: municipioId
 *         schema:
 *           type: integer
 *         description: Filtrar por municipio
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDIENTE, ACTIVO, RECHAZADO, SUSPENDIDO]
 *         description: Filtrar por estado
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
 *         description: Lista paginada de comunidades
 *       400:
 *         description: Filtros inválidos
 */
comunidadRouter.get('/', async (req: Request, res: Response) => {
  const parsed = filtrosComunidadSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }
  // El mapa es público — no requiere auth, pero si hay token lo usa para filtrar
  const result = await comunidadService.getAll(parsed.data, req.user);
  res.json(result);
});

/**
 * @swagger
 * /api/v1/comunidades/{slug}:
 *   get:
 *     summary: Obtener detalle de una comunidad por slug
 *     tags: [Comunidades]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: "donaji-20057-0026"
 *     responses:
 *       200:
 *         description: Detalle de la comunidad
 *       400:
 *         description: Slug inválido
 *       404:
 *         description: Comunidad no encontrada
 */
comunidadRouter.get('/:slug', async (req: Request, res: Response) => {
  const parsed = slugParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const comunidad = await comunidadService.getBySlug(parsed.data.slug);
  res.json(comunidad);
});

/**
 * @swagger
 * /api/v1/comunidades:
 *   post:
 *     summary: Crear una comunidad (RF-07-1) — solo ADMIN o SUPER_ADMIN
 *     tags: [Comunidades]
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
 *                 example: "Colonia Centro"
 *               municipioId:
 *                 type: integer
 *                 example: 1
 *               cpId:
 *                 type: integer
 *                 example: 100
 *               color:
 *                 type: string
 *                 example: "#3B82F6"
 *               logoUrl:
 *                 type: string
 *                 example: "https://example.com/logo.png"
 *     responses:
 *       201:
 *         description: Comunidad creada en estado PENDIENTE
 *       400:
 *         description: Datos inválidos o nombre duplicado en ese municipio
 *       401:
 *         description: Token requerido
 *       403:
 *         description: Sin permisos suficientes
 *       404:
 *         description: Municipio o código postal no encontrado
 */
comunidadRouter.post(
  '/',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: Request, res: Response) => {
    const parsed = createComunidadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const comunidad = await comunidadService.create(parsed.data, req.user!);
    res.status(201).json(comunidad);
  }
);

/**
 * @swagger
 * /api/v1/comunidades/{slug}:
 *   patch:
 *     summary: Actualizar una comunidad — solo ADMIN o SUPER_ADMIN
 *     tags: [Comunidades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               color:
 *                 type: string
 *                 example: "#EF4444"
 *               logoUrl:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [PENDIENTE, ACTIVO, RECHAZADO, SUSPENDIDO]
 *               cpId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Comunidad actualizada
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token requerido
 *       403:
 *         description: Sin permisos suficientes
 *       404:
 *         description: Comunidad no encontrada
 */
comunidadRouter.patch(
  '/:slug',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: Request, res: Response) => {
    const slugParsed = slugParamSchema.safeParse(req.params);
    if (!slugParsed.success) {
      res.status(400).json({ errors: slugParsed.error.flatten().fieldErrors });
      return;
    }

    const bodyParsed = updateComunidadSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({ errors: bodyParsed.error.flatten().fieldErrors });
      return;
    }

    const comunidad = await comunidadService.update(
      slugParsed.data.slug,
      bodyParsed.data,
      req.user!
    );
    res.json(comunidad);
  }
);