import { getRankingUsuarios } from './ranking.repository';

export async function obtenerRanking(limit: number) {
  return getRankingUsuarios(limit);
}