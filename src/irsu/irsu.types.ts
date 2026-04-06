import { Categoria } from '@prisma/client';

export interface IrsuResultado {
  comunidadId:      number;
  valor:            number;
  totalReportes:    number;
  gravedadPromedio: number;
  tendencia:        number;
  porCategoria:     IrsuCategoria[];
}

export interface IrsuCategoria {
  categoria:        Categoria;
  valor:            number;
  totalReportes:    number;
  gravedadPromedio: number;
}

export interface IrsuHistorialItem {
  id:               number;
  valor:            number;
  totalReportes:    number;
  gravedadPromedio: number;
  tendencia:        number;
  categoria:        Categoria | null;
  createdAt:        Date;
}