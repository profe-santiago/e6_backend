import { Router, Request, Response, NextFunction } from 'express';
import { obtenerRanking } from './ranking.service';
import { getRankingSchema } from './ranking.schema';

export const rankingRouter = Router();

/**
 * @swagger
 * /api/v1/ranking:
 *   get:
 *     summary: Ranking de usuarios con más reportes creados
 *     tags: [Ranking]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Número de usuarios a mostrar en el ranking
 *     responses:
 *       200:
 *         description: Lista de usuarios ordenados por cantidad de reportes creados (mayor primero)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   posicion:
 *                     type: integer
 *                     example: 1
 *                   id:
 *                     type: integer
 *                     example: 42
 *                   nombre:
 *                     type: string
 *                     nullable: true
 *                     example: "Juan Pérez"
 *                   avatarUrl:
 *                     type: string
 *                     nullable: true
 *                     example: "/uploads/avatars/avatar-1716000000000.jpg"
 *                   totalReportes:
 *                     type: integer
 *                     example: 87
 *       400:
 *         description: Parámetro limit fuera de rango (1-50)
 */
rankingRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = getRankingSchema.parse({ query: req.query });
    const data = await obtenerRanking(query.limit);
    res.json(data);
  } catch (error) {
    next(error);
  }
});