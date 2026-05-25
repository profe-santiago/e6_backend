import { Router, Request, Response, NextFunction } from 'express';
import { estadisticasService } from './estadisticas.service';

export const estadisticasRouter = Router();

/**
 * @swagger
 * /api/v1/estadisticas:
 *   get:
 *     summary: Estadísticas globales del sistema en tiempo real
 *     description: >
 *       Devuelve conteos del sistema agrupados por categoría.
 *       Endpoint público — no requiere autenticación.
 *       Útil para dashboards y pantallas de resumen.
 *     tags: [Estadísticas]
 *     responses:
 *       200:
 *         description: Estadísticas globales calculadas en tiempo real
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reportes:
 *                   type: object
 *                   properties:
 *                     total:      { type: integer, example: 142 }
 *                     pendientes: { type: integer, example: 89  }
 *                     en_proceso: { type: integer, example: 31  }
 *                     resueltos:  { type: integer, example: 20  }
 *                     rechazados: { type: integer, example: 2   }
 *                 comunidades:
 *                   type: object
 *                   properties:
 *                     total_activas: { type: integer, example: 423 }
 *                     irsu_critico:  { type: integer, example: 7,  description: "IRSU >= 70" }
 *                     irsu_atencion: { type: integer, example: 48, description: "IRSU 40–69" }
 *                     irsu_normal:   { type: integer, example: 368,description: "IRSU < 40"  }
 *                 alertas:
 *                   type: object
 *                   properties:
 *                     activas: { type: integer, example: 12 }
 *                 usuarios:
 *                   type: object
 *                   properties:
 *                     total_registrados: { type: integer, example: 58 }
 */
estadisticasRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await estadisticasService.getGlobales();
    res.json(data);
  } catch (error) {
    next(error);
  }
});
