import { z } from 'zod';
import { Categoria } from '@prisma/client';

export const slugParamSchema = z.object({
  slug: z.string().trim().min(1),
});

export const filtrosHistorialSchema = z.object({
  categoria: z.nativeEnum(Categoria).optional(),
  desde:     z.coerce.date().optional(),
  hasta:     z.coerce.date().optional(),
  limit:     z.coerce.number().int().min(1).max(100).default(30),
});

export const dashboardStatsSchema = z.object({
  periodo: z.enum(['7D', '30D', '90D']).default('30D'),
});

export type DashboardStatsInput = z.infer<typeof dashboardStatsSchema>;
export type SlugParam            = z.infer<typeof slugParamSchema>;
export type FiltrosHistorialInput = z.infer<typeof filtrosHistorialSchema>;