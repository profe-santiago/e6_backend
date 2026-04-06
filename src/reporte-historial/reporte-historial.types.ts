import { EstadoReporte } from '@prisma/client';

export interface ReporteHistorialItem {
  id:             number;
  reporteId:      number;
  estadoAnterior: EstadoReporte | null;
  estadoNuevo:    EstadoReporte;
  nota:           string | null;
  createdAt:      Date;
  usuario:        { id: number; nombre: string | null; email: string };
}