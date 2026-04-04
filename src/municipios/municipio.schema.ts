import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('El ID debe ser un entero positivo'),
});

export const claveMunicipioSchema = z.object({
  clave: z.string().trim().length(5, 'La clave debe tener 5 caracteres'),
});

export const nombreParamSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre no puede estar vacío'),
});

export type IdParam     = z.infer<typeof idParamSchema>;
export type ClaveParam  = z.infer<typeof claveMunicipioSchema>;
export type NombreParam = z.infer<typeof nombreParamSchema>;