import { z } from 'zod';
import { Rol } from '@prisma/client';

export const createAdminSchema = z.object({
  email:       z.string().email('Email inválido'),
  password:    z.string().min(8, 'Mínimo 8 caracteres'),
  nombre:      z.string().min(1).max(100).optional(),
  municipioId: z.number().int().positive('municipioId requerido'),
});

export const createCoordinadorSchema = z.object({
  email:       z.string().email('Email inválido'),
  password:    z.string().min(8, 'Mínimo 8 caracteres'),
  nombre:      z.string().min(1).max(100).optional(),
  comunidadId: z.number().int().positive('comunidadId requerido'),
});

export const createOperadorSchema = z.object({
  email:       z.string().email('Email inválido'),
  password:    z.string().min(8, 'Mínimo 8 caracteres'),
  nombre:      z.string().min(1).max(100).optional(),
  municipioId: z.number().int().positive('municipioId requerido'),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('El ID debe ser un entero positivo'),
});

export const filtrosUsuarioSchema = z.object({
  rol:         z.nativeEnum(Rol).optional(),
  activo:      z.coerce.boolean().optional(),
  municipioId: z.coerce.number().int().positive().optional(),
  comunidadId: z.coerce.number().int().positive().optional(),
  page:        z.coerce.number().int().positive().default(1),
  limit:       z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateAdminInput        = z.infer<typeof createAdminSchema>;
export type CreateCoordinadorInput  = z.infer<typeof createCoordinadorSchema>;
export type CreateOperadorInput     = z.infer<typeof createOperadorSchema>;
export type IdParam                 = z.infer<typeof idParamSchema>;
export type FiltrosUsuarioInput     = z.infer<typeof filtrosUsuarioSchema>;