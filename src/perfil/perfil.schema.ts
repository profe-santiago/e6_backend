import { z } from 'zod';

export const actualizarPerfilSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
});

export const agregarComunidadSchema = z.object({
  comunidadId: z.number().int().positive(),
});