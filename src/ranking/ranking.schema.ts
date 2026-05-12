import { z } from 'zod';

export const getRankingSchema = z.object({
  query: z.object({
    limit: z.coerce.number().min(1).max(50).default(10),
  }),
});