import { z } from 'zod';

export const reporteIdParamSchema = z.object({
  reporteId: z.coerce.number().int().positive(),
});

export const filtrosHistorialSchema = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ReporteIdParam        = z.infer<typeof reporteIdParamSchema>;
export type FiltrosHistorialInput = z.infer<typeof filtrosHistorialSchema>;