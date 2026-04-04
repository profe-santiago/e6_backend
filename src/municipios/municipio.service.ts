import { Municipio } from '@prisma/client';
import { municipioRepository } from './municipio.repository';
import { prisma } from '../lib/prisma';

export const municipioService ={
    getAll: (): Promise<Municipio[]> => {
        return municipioRepository.findAll();
    },

    getById: async (id: number): Promise<Municipio> => {
        const municipio = await municipioRepository.findById(id);
        if (!municipio) {
            throw Object.assign(new Error('Municipio no encontrado'), { statusCode: 404 });
        }
        return municipio;
    },

    getByClave: async (clave: string ): Promise<Municipio> => {
        const municipio = await municipioRepository.findByClave(clave);
        if (!municipio) {
            throw Object.assign(new Error('Municipio no encontrado'), { statusCode: 404 });
        }
        return municipio;
    },

    getByNombre: async (nombre: string ): Promise<Municipio> => {
        const municipio = await municipioRepository.findByNombre(nombre);
        if (!municipio) {
            throw Object.assign(new Error('Municipio no encontrado'), { statusCode: 404 });
        }
        return municipio;
    },

    getComunidadesByMunicipio: async (municipioId: number) => {
        await municipioService.getById(municipioId); // lanza 404 si no existe
        return municipioRepository.findComunidadesByMunicipio(municipioId);
    },


};