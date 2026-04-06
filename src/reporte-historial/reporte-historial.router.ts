import { Router, Request, Response } from 'express';
import { reporteHistorialService } from './reporte-historial.service';
import { reporteIdParamSchema, filtrosHistorialSchema } from './reporte-historial.schema';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const reporteHistorialRouter = Router({ mergeParams: true });

/**
 * @swagger
 * /api/v1/reportes/{reporteId}/historial:
 *   get:
 *     summary: Historial de cambios de estado de un reporte — autoridades
 *     tags: [ReporteHistorial]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reporteId
 *         required: true
 *         schema:
 *           type: integer
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
 *         description: Historial paginado de cambios de estado
 *       401:
 *         description: Token requerido
 *       403:
 *         description: Sin permisos suficientes
 *       404:
 *         description: Reporte no encontrado
 */
reporteHistorialRouter.get(
  '/',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN', 'COORDINADOR'),
  async (req: Request, res: Response) => {
    const paramParsed = reporteIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
      res.status(400).json({ errors: paramParsed.error.flatten().fieldErrors });
      return;
    }

    const queryParsed = filtrosHistorialSchema.safeParse(req.query);
    if (!queryParsed.success) {
      res.status(400).json({ errors: queryParsed.error.flatten().fieldErrors });
      return;
    }

    const result = await reporteHistorialService.getByReporte(
      paramParsed.data.reporteId,
      queryParsed.data
    );
    res.json(result);
  }
);