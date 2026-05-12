import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const asignacionIdParamSchema = z.object({
  id:           z.coerce.number().int().positive(),
  asignacionId: z.coerce.number().int().positive(),
});

export const createCuadrillaSchema = z.object({
  nombre:      z.string().trim().min(2).max(100),
  descripcion: z.string().trim().max(500).optional(),
  municipioId: z.number().int().positive(),
});

export const updateCuadrillaSchema = z.object({
  nombre:      z.string().trim().min(2).max(100).optional(),
  descripcion: z.string().trim().max(500).optional(),
  activa:      z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'Envía al menos un campo' });

export const asignarCuadrillaSchema = z.object({
  cuadrillaId: z.number().int().positive(),
  reporteId:   z.number().int().positive(),
  nota:        z.string().trim().max(500).optional(),
});

export const cambiarEstadoAsignacionSchema = z.object({
  estado: z.enum(['ASIGNADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA']),
  nota:   z.string().trim().max(500).optional(),
});

export const filtrosCuadrillaSchema = z.object({
  municipioId: z.coerce.number().int().positive().optional(),
  activa:      z.coerce.boolean().optional(),
  page:        z.coerce.number().int().positive().default(1),
  limit:       z.coerce.number().int().min(1).max(100).default(50),
});

export const filtrosAsignacionSchema = z.object({
  cuadrillaId: z.coerce.number().int().positive().optional(),
  estado:      z.enum(['ASIGNADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA']).optional(),
  page:        z.coerce.number().int().positive().default(1),
  limit:       z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCuadrillaInput         = z.infer<typeof createCuadrillaSchema>;
export type UpdateCuadrillaInput         = z.infer<typeof updateCuadrillaSchema>;
export type AsignarCuadrillaInput        = z.infer<typeof asignarCuadrillaSchema>;
export type CambiarEstadoAsignacionInput = z.infer<typeof cambiarEstadoAsignacionSchema>;
export type FiltrosCuadrillaInput        = z.infer<typeof filtrosCuadrillaSchema>;
export type FiltrosAsignacionInput       = z.infer<typeof filtrosAsignacionSchema>;