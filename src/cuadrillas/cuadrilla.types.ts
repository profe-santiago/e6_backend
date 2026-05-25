export type EstadoAsignacion = 'ASIGNADA' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA';

export interface CuadrillaResumen {
  id:          number;
  nombre:      string;
  descripcion: string | null;
  activa:      boolean;
  municipio:   { id: number; nombre: string };
  createdAt:   Date;
  _count?:     { asignaciones: number };
}

export interface AsignacionResumen {
  id:           number;
  estado:       EstadoAsignacion;
  nota:         string | null;
  asignadoEn:   Date;
  iniciadaEn:   Date | null;
  completadaEn: Date | null;
  cuadrilla:    { id: number; nombre: string };
  reporte:      { id: number; titulo: string; gravedad: number; categoria: string; comunidad: { nombre: string } };
  usuario:      { id: number; nombre: string | null; email: string };
}

export interface CreateCuadrillaDto {
  nombre:      string;
  descripcion?: string;
  municipioId: number;
}

export interface UpdateCuadrillaDto {
  nombre?:      string;
  descripcion?: string;
  activa?:      boolean;
}

export interface AsignarCuadrillaDto {
  cuadrillaId: number;
  reporteId:   number;
  nota?:       string;
}

export interface CambiarEstadoAsignacionDto {
  estado: EstadoAsignacion;
  nota?:  string;
}