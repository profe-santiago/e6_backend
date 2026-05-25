import { estadisticasRepository } from './estadisticas.repository';

export const estadisticasService = {
  getGlobales: () => estadisticasRepository.getGlobales(),
};
