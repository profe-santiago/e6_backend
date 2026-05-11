import { Rol } from '@prisma/client';

export interface TokenPayload {
  sub: number;
  email: string;
  rol: Rol;
  comunidadId?: number;
  municipioId?: number;
}

export interface AuthResponse {
  token: string;
  usuario: {
    id: number;
    email: string;
    nombre: string | null;
    rol: Rol;
  };
}