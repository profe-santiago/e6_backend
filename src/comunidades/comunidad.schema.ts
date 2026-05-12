import { z } from 'zod';
import { EstadoComunidad } from '@prisma/client';

export const slugParamSchema = z.object({
  slug: z.string().trim().min(1, 'El slug no puede estar vacío'),
});

export const createComunidadSchema = z.object({
  nombre:      z.string().trim().min(2).max(200),
  municipioId: z.number().int().positive('El municipioId debe ser un entero positivo'),
  cpId:        z.number().int().positive().optional(),
  color:       z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'El color debe ser un hex válido (#RRGGBB)')
    .optional(),
  logoUrl: z.string().url('El logoUrl debe ser una URL válida').optional(),
});

export const updateComunidadSchema = z.object({
  nombre:  z.string().trim().min(2).max(200).optional(),
  color:   z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'El color debe ser un hex válido (#RRGGBB)')
    .optional(),
  logoUrl: z.string().url('El logoUrl debe ser una URL válida').optional(),
  status:  z.nativeEnum(EstadoComunidad).optional(),
  cpId:    z.number().int().positive().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Debes enviar al menos un campo para actualizar' }
);

export const filtrosComunidadSchema = z.object({
  municipioId: z.coerce.number().int().positive().optional(),
  status:      z.nativeEnum(EstadoComunidad).optional(),
  page:        z.coerce.number().int().positive().default(1),
  limit:       z.coerce.number().int().min(1).max(13000).default(20),
});

export type SlugParam             = z.infer<typeof slugParamSchema>;
export type CreateComunidadInput  = z.infer<typeof createComunidadSchema>;
export type UpdateComunidadInput  = z.infer<typeof updateComunidadSchema>;
export type FiltrosComunidadInput = z.infer<typeof filtrosComunidadSchema>;