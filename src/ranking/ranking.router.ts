import { Router, Request, Response, NextFunction } from 'express';
import { obtenerRanking } from './ranking.service';
import { getRankingSchema } from './ranking.schema';

export const rankingRouter = Router();

rankingRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = getRankingSchema.parse({ query: req.query });
    const data = await obtenerRanking(query.limit);
    res.json(data);
  } catch (error) {
    next(error);
  }
});