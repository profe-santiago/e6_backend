import { z } from 'zod';

export const codigoQuerySchema = z.object({
  codigo: z
    .string()
    .trim()
    .regex(/^\d{5}$/, 'El código postal debe ser exactamente 5 dígitos numéricos'),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('El ID debe ser un entero positivo'),
});

export const municipioIdParamSchema = z.object({
  municipioId: z.coerce.number().int().positive('El ID de municipio debe ser un entero positivo'),
});

export type CodigoQuery        = z.infer<typeof codigoQuerySchema>;
export type IdParam             = z.infer<typeof idParamSchema>;
export type MunicipioIdParam    = z.infer<typeof municipioIdParamSchema>;