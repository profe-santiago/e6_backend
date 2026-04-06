import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { irsuService } from './irsu.service';
import { slugParamSchema, filtrosHistorialSchema } from './irsu.schema';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { optionalAuth } from '../middleware/optional-auth.middleware';

export const irsuRouter = Router();

/**
 * @swagger
 * /api/v1/irsu/{slug}:
 *   get:
 *     summary: Calcular y obtener IRSU actual de una comunidad
 *     tags: [IRSU]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: "colonia-centro-420-abc123"
 *     responses:
 *       200:
 *         description: Resultado del cálculo IRSU global y por categoría
 *       404:
 *         description: Comunidad no encontrada
 */
irsuRouter.get('/:slug', optionalAuth, async (req: Request, res: Response) => {
  const parsed = slugParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const comunidad = await prisma.comunidad.findUnique({
    where:  { slug: parsed.data.slug },
    select: { id: true },
  });

  if (!comunidad) {
    res.status(404).json({ error: 'Comunidad no encontrada' });
    return;
  }

  const resultado = await irsuService.calcular(comunidad.id);
  res.json(resultado);
});

/**
 * @swagger
 * /api/v1/irsu/{slug}/historial:
 *   get:
 *     summary: Historial IRSU de una comunidad
 *     tags: [IRSU]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoria
 *         schema:
 *           type: string
 *           enum: [INFRAESTRUCTURA, VIALIDAD, BLOQUEOS, SEGURIDAD]
 *       - in: query
 *         name: desde
 *         schema:
 *           type: string
 *           format: date
 *         example: "2025-01-01"
 *       - in: query
 *         name: hasta
 *         schema:
 *           type: string
 *           format: date
 *         example: "2025-12-31"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Historial de valores IRSU con tendencia
 *       404:
 *         description: Comunidad no encontrada
 */
irsuRouter.get(
  '/:slug/historial',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN', 'COORDINADOR'),
  async (req: Request, res: Response) => {
    const slugParsed = slugParamSchema.safeParse(req.params);
    if (!slugParsed.success) {
      res.status(400).json({ errors: slugParsed.error.flatten().fieldErrors });
      return;
    }

    const filtrosParsed = filtrosHistorialSchema.safeParse(req.query);
    if (!filtrosParsed.success) {
      res.status(400).json({ errors: filtrosParsed.error.flatten().fieldErrors });
      return;
    }

    const comunidad = await prisma.comunidad.findUnique({
      where:  { slug: slugParsed.data.slug },
      select: { id: true },
    });

    if (!comunidad) {
      res.status(404).json({ error: 'Comunidad no encontrada' });
      return;
    }

    const historial = await irsuService.getHistorial(comunidad.id, filtrosParsed.data);
    res.json(historial);
  }
);

/**
 * @swagger
 * /api/v1/irsu/recalcular/todas:
 *   post:
 *     summary: Recalcular IRSU de todas las comunidades activas — solo SUPER_ADMIN
 *     tags: [IRSU]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resultado del recálculo masivo
 *       403:
 *         description: Sin permisos suficientes
 */
irsuRouter.post(
  '/recalcular/todas',
  authenticate,
  authorize('SUPER_ADMIN'),
  async (_req: Request, res: Response) => {
    const resultado = await irsuService.calcularTodas();
    res.json(resultado);
  }
);