import { z } from 'zod';

export const reporteIdParamSchema = z.object({
  reporteId: z.coerce.number().int().positive(),
});

export const fotoIdParamSchema = z.object({
  reporteId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});

export type ReporteIdParam = z.infer<
  typeof reporteIdParamSchema
>;

export type FotoIdParam = z.infer<
  typeof fotoIdParamSchema
>;