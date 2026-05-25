export interface EstadisticasReportes {
  total:       number;
  pendientes:  number;
  en_proceso:  number;
  resueltos:   number;
  rechazados:  number;
}

export interface EstadisticasComunidades {
  total_activas:  number;
  irsu_critico:   number;  // IRSU >= 70
  irsu_atencion:  number;  // IRSU 40–69
  irsu_normal:    number;  // IRSU < 40
}

export interface EstadisticasAlertas {
  activas: number;
}

export interface EstadisticasUsuarios {
  total_registrados: number;
}

export interface EstadisticasGlobales {
  reportes:    EstadisticasReportes;
  comunidades: EstadisticasComunidades;
  alertas:     EstadisticasAlertas;
  usuarios:    EstadisticasUsuarios;
}
