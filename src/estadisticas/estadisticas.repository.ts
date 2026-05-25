import { prisma } from '../lib/prisma';
import { EstadisticasGlobales } from './estadisticas.types';

export const estadisticasRepository = {
  getGlobales: async (): Promise<EstadisticasGlobales> => {
    const [
      totalReportes,
      pendientes,
      enProceso,
      resueltos,
      rechazados,
      totalComunidadesActivas,
      irsuCritico,
      irsuAtencion,
      irsuNormal,
      alertasActivas,
      totalUsuarios,
    ] = await Promise.all([
      prisma.reporte.count({ where: { deletedAt: null } }),
      prisma.reporte.count({ where: { deletedAt: null, estado: 'PENDIENTE'  } }),
      prisma.reporte.count({ where: { deletedAt: null, estado: 'EN_PROCESO' } }),
      prisma.reporte.count({ where: { deletedAt: null, estado: 'RESUELTO'   } }),
      prisma.reporte.count({ where: { deletedAt: null, estado: 'RECHAZADO'  } }),

      prisma.comunidad.count({ where: { status: 'ACTIVO' } }),
      prisma.comunidad.count({ where: { status: 'ACTIVO', irsuActual: { gte: 70 } } }),
      prisma.comunidad.count({ where: { status: 'ACTIVO', irsuActual: { gte: 40, lt: 70 } } }),
      prisma.comunidad.count({ where: { status: 'ACTIVO', irsuActual: { lt: 40 } } }),

      prisma.alerta.count({ where: { estado: { in: ['ACTIVA', 'EN_ATENCION'] } } }),

      prisma.usuario.count({ where: { activo: true } }),
    ]);

    return {
      reportes: {
        total:      totalReportes,
        pendientes,
        en_proceso: enProceso,
        resueltos,
        rechazados,
      },
      comunidades: {
        total_activas: totalComunidadesActivas,
        irsu_critico:  irsuCritico,
        irsu_atencion: irsuAtencion,
        irsu_normal:   irsuNormal,
      },
      alertas: {
        activas: alertasActivas,
      },
      usuarios: {
        total_registrados: totalUsuarios,
      },
    };
  },
};
