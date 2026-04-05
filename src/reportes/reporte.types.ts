import { Categoria, EstadoReporte, FuenteReporte } from '@prisma/client';

export interface ReporteResumen {
  id:          number;
  titulo:      string;
  gravedad:    number;
  categoria:   Categoria;
  estado:      EstadoReporte;
  fuente:      FuenteReporte;
  latitud:     number;
  longitud:    number;
  voteCount:   number;
  comunidad:   { id: number; nombre: string; slug: string };
  usuario:     { id: number; nombre: string | null; email: string } | null;
  fotos:       { id: number; url: string }[];
  createdAt:   Date;
}

export interface ReporteDetalle extends ReporteResumen {
  descripcion:  string | null;
  sincronizado: boolean;
  historial:    {
    id:            number;
    estadoAnterior: EstadoReporte | null;
    estadoNuevo:   EstadoReporte;
    nota:          string | null;
    createdAt:     Date;
    usuario:       { id: number; nombre: string | null; email: string };
  }[];
}

export interface CreateReporteDto {
  titulo:      string;
  descripcion?: string;
  gravedad:    number;
  categoria:   Categoria;
  fuente:      FuenteReporte;
  latitud:     number;
  longitud:    number;
  comunidadId: number;
  usuarioId?:  number;
  deviceIp?:   string;
  fotos?:      string[];
  sincronizado?: boolean;
}

export interface CambiarEstadoDto {
  estado: EstadoReporte;
  nota?:  string;
}