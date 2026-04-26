import { prisma } from '../lib/prisma';
import { AppError } from '../lib/app-error';
import { codigoPostalRepository } from './codigo-postal.repository';
import { CodigoPostalResponse } from './codigo-postal.types';

export const codigoPostalService = {
  getByCodigo: (codigo: string): Promise<CodigoPostalResponse[]> =>
    codigoPostalRepository.findByCodigo(codigo),

  getById: async (id: number): Promise<CodigoPostalResponse> => {
    const cp = await codigoPostalRepository.findById(id);
    if (!cp) throw new AppError(404, 'Código postal no encontrado');
    return cp;
  },

  getByMunicipio: async (municipioId: number): Promise<CodigoPostalResponse[]> => {
    const municipio = await prisma.municipio.findUnique({ where: { id: municipioId } });
    if (!municipio) throw new AppError(404, 'Municipio no encontrado');
    return codigoPostalRepository.findByMunicipio(municipioId);
  },
};