import { z } from 'zod';
import { Categoria, EstadoReporte, FuenteReporte } from '@prisma/client';

export const createReporteSchema = z.object({
  titulo:      z.string().trim().min(3).max(120),
  descripcion: z.string().trim().max(2000).optional(),
  gravedad:    z.number().int().min(1).max(5),
  categoria:   z.nativeEnum(Categoria),
  fuente:      z.nativeEnum(FuenteReporte).default('APP_MOVIL'),
  latitud:     z.number().min(-90).max(90),
  longitud:    z.number().min(-180).max(180),
  comunidadId: z.number().int().positive(),
  fotos:       z.array(z.string().url()).max(10).optional(),
  sincronizado: z.boolean().default(true),
});

export const updateReporteSchema = z.object({
  titulo:      z.string().trim().min(3).max(120).optional(),
  descripcion: z.string().trim().max(2000).optional(),
  gravedad:    z.number().int().min(1).max(5).optional(),
  categoria:   z.nativeEnum(Categoria).optional(),
  fotos:       z.array(z.string().url()).max(10).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Debes enviar al menos un campo para actualizar' }
);

export const cambiarEstadoSchema = z.object({
  estado: z.nativeEnum(EstadoReporte),
  nota:   z.string().trim().max(500).optional(),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const filtrosReporteSchema = z.object({
  comunidadId: z.coerce.number().int().positive().optional(),
  categoria:   z.nativeEnum(Categoria).optional(),
  estado:      z.nativeEnum(EstadoReporte).optional(),
  fuente:      z.nativeEnum(FuenteReporte).optional(),
  usuarioId:   z.coerce.number().int().positive().optional(),
  page:        z.coerce.number().int().positive().default(1),
  limit:       z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateReporteInput   = z.infer<typeof createReporteSchema>;
export type UpdateReporteInput   = z.infer<typeof updateReporteSchema>;
export type CambiarEstadoInput   = z.infer<typeof cambiarEstadoSchema>;
export type IdParam              = z.infer<typeof idParamSchema>;
export type FiltrosReporteInput  = z.infer<typeof filtrosReporteSchema>;