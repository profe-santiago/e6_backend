// Esquemas Zod para validar el body de los requests.
// Zod valida en runtime; TypeScript infiere los tipos en tiempo de compilación.
import { z } from 'zod';

export const registerSchema = z.object({
    email: z.string().email('Email inválido'),
    nombre: z.string().min(1).max(100).optional(),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
}
);

export const loginSchema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken requerido'),
});

// Tipo inferido automáticamente desde el schema
export type RefreshInput = z.infer<typeof refreshSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

