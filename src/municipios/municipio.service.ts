import { Municipio } from '@prisma/client';
import { AppError } from '../lib/app-error';
import { municipioRepository } from './municipio.repository';

export const municipioService = {
  getAll: (): Promise<Municipio[]> => municipioRepository.findAll(),

  getById: async (id: number): Promise<Municipio> => {
    const municipio = await municipioRepository.findById(id);
    if (!municipio) throw new AppError(404, 'Municipio no encontrado');
    return municipio;
  },

  getByClave: async (clave: string): Promise<Municipio> => {
    const municipio = await municipioRepository.findByClave(clave);
    if (!municipio) throw new AppError(404, 'Municipio no encontrado');
    return municipio;
  },

  getByNombre: async (nombre: string): Promise<Municipio> => {
    const municipio = await municipioRepository.findByNombre(nombre);
    if (!municipio) throw new AppError(404, 'Municipio no encontrado');
    return municipio;
  },

  getComunidadesByMunicipio: async (municipioId: number) => {
    await municipioService.getById(municipioId);
    return municipioRepository.findComunidadesByMunicipio(municipioId);
  },
};