import { z } from 'zod';

export const reporteIdParamSchema = z.object({
  reporteId: z.coerce.number().int().positive(),
});

export type ReporteIdParam = z.infer<typeof reporteIdParamSchema>;