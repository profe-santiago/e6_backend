import { z } from 'zod';

export const reporteIdParamSchema = z.object({
  reporteId: z.coerce.number().int().positive(),
});

export const fotoIdParamSchema = z.object({
  reporteId: z.coerce.number().int().positive(),
  id:        z.coerce.number().int().positive(),
});

export const addFotosSchema = z.object({
  urls: z
    .array(z.string().url('Cada URL debe ser válida'))
    .min(1, 'Debes enviar al menos una URL')
    .max(10, 'Máximo 10 fotos por petición'),
});

export type ReporteIdParam  = z.infer<typeof reporteIdParamSchema>;
export type FotoIdParam     = z.infer<typeof fotoIdParamSchema>;
export type AddFotosInput   = z.infer<typeof addFotosSchema>;