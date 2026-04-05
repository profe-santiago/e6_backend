import { Rol } from '@prisma/client';

export interface UsuarioResumen {
  id:          number;
  email:       string;
  nombre:      string | null;
  rol:         Rol;
  activo:      boolean;
  municipio:   { id: number; nombre: string } | null;
  comunidad:   { id: number; nombre: string; slug: string } | null;
  createdAt:   Date;
}

export interface CreateUsuarioDto {
  email:       string;
  password:    string;
  nombre?:     string;
  rol:         Rol;
  municipioId?: number;
  comunidadId?: number;
}