import { Router, Request, Response } from 'express';
import { votoService } from './voto.service';
import { reporteIdParamSchema } from './voto.schema';
import { authenticate } from '../middleware/auth.middleware';
import { optionalAuth } from '../middleware/optional-auth.middleware';

export const votoRouter = Router({ mergeParams: true });

/**
 * @swagger
 * /api/v1/reportes/{reporteId}/votos:
 *   get:
 *     summary: Obtener votos de un reporte
 *     tags: [Votos]
 *     parameters:
 *       - in: path
 *         name: reporteId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Resumen de votos con lista de usuarios que votaron
 *       404:
 *         description: Reporte no encontrado
 */
votoRouter.get('/', optionalAuth, async (req: Request, res: Response) => {
  const parsed = reporteIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const result = await votoService.getByReporte(parsed.data.reporteId, req.user);
  res.json(result);
});

/**
 * @swagger
 * /api/v1/reportes/{reporteId}/votos:
 *   post:
 *     summary: Votar por un reporte
 *     tags: [Votos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reporteId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Voto registrado
 *       400:
 *         description: Ya votaste por este reporte
 *       401:
 *         description: Token requerido
 *       404:
 *         description: Reporte no encontrado
 */
votoRouter.post('/', authenticate, async (req: Request, res: Response) => {
  const parsed = reporteIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const result = await votoService.votar(parsed.data.reporteId, req.user!);
  res.json(result);
});

/**
 * @swagger
 * /api/v1/reportes/{reporteId}/votos:
 *   delete:
 *     summary: Quitar voto de un reporte
 *     tags: [Votos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reporteId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Voto eliminado
 *       400:
 *         description: No has votado por este reporte
 *       401:
 *         description: Token requerido
 *       404:
 *         description: Reporte no encontrado
 */
votoRouter.delete('/', authenticate, async (req: Request, res: Response) => {
  const parsed = reporteIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const result = await votoService.quitarVoto(parsed.data.reporteId, req.user!);
  res.json(result);
});