import { prisma } from '../lib/prisma';
import { codigoPostalRepository } from './codigo-postal.repository';
import { CodigoPostalResponse } from './codigo-postal.types';

export const codigoPostalService = {
  getByCodigo: (codigo: string): Promise<CodigoPostalResponse[]> => {
    return codigoPostalRepository.findByCodigo(codigo);
  },

  getById: async (id: number): Promise<CodigoPostalResponse> => {
    const cp = await codigoPostalRepository.findById(id);
    if (!cp) {
      throw Object.assign(new Error('Código postal no encontrado'), { statusCode: 404 });
    }
    return cp;
  },

  getByMunicipio: async (municipioId: number): Promise<CodigoPostalResponse[]> => {
    const municipio = await prisma.municipio.findUnique({ where: { id: municipioId } });
    if (!municipio) {
      throw Object.assign(new Error('Municipio no encontrado'), { statusCode: 404 });
    }
    return codigoPostalRepository.findByMunicipio(municipioId);
  },
};