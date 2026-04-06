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

export type SlugParam            = z.infer<typeof slugParamSchema>;
export type FiltrosHistorialInput = z.infer<typeof filtrosHistorialSchema>;