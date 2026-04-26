import { Estado } from '@prisma/client';
import { AppError } from '../lib/app-error';
import { estadoRepository } from './estado.repository';

export const estadoService = {
  getAll: (): Promise<Estado[]> => estadoRepository.findAll(),

  getById: async (id: number): Promise<Estado> => {
    const estado = await estadoRepository.findById(id);
    if (!estado) throw new AppError(404, 'Estado no encontrado');
    return estado;
  },

  getByClave: async (clave: string): Promise<Estado> => {
    const estado = await estadoRepository.findByClave(clave);
    if (!estado) throw new AppError(404, 'Estado no encontrado');
    return estado;
  },

  getByNombre: async (nombre: string): Promise<Estado> => {
    const estado = await estadoRepository.findByNombre(nombre);
    if (!estado) throw new AppError(404, 'Estado no encontrado');
    return estado;
  },

  getMunicipiosByEstado: async (id: number) => {
    await estadoService.getById(id);
    return estadoRepository.findMunicipiosByEstado(id);
  },
};