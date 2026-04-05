import { EstadoComunidad, Categoria } from '@prisma/client';

export interface ComunidadResumen {
  id:         number;
  nombre:     string;
  slug:       string;
  status:     EstadoComunidad;
  irsuActual: number;
  color:      string;
  logoUrl:    string | null;
  municipio:  { id: number; nombre: string };
}

export interface ComunidadDetalle extends ComunidadResumen {
  codigoPostal: { id: number; codigo: string; colonia: string } | null;
  createdAt:    Date;
  updatedAt:    Date;
}

export interface CreateComunidadDto {
  nombre:      string;
  municipioId: number;
  cpId?:       number;
  color?:      string;
  logoUrl?:    string;
}

export interface UpdateComunidadDto {
  nombre?:   string;
  color?:    string;
  logoUrl?:  string;
  status?:   EstadoComunidad;
  cpId?:     number;
}