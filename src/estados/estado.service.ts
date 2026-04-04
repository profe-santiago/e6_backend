import { Estado } from '@prisma/client';
import { estadoRepository } from './estado.repository';

export const estadoService ={
    getAll: (): Promise<Estado[]> => {
        return estadoRepository.findAll();
    },

    getById: async (id: number): Promise<Estado> => {
        const estado = await estadoRepository.findById(id);
        if (!estado) {
            throw Object.assign(new Error('Estado no encontrado'), { statusCode: 404 });
        }
        return estado;
    },

    getByClave: async (clave: string ): Promise<Estado> => {
        const estado = await estadoRepository.findByClave(clave);
        if (!estado) {
            throw Object.assign(new Error('Estado no encontrado'), { statusCode: 404 });
        }
        return estado;
    },

    getByNombre: async (nombre: string ): Promise<Estado> => {
        const estado = await estadoRepository.findByNombre(nombre);
        if (!estado) {
            throw Object.assign(new Error('Estado no encontrado'), { statusCode: 404 });
        }
        return estado;
    },

    getMunicipiosByEstado: async (id: number) => {
        await estadoService.getById(id);
        return estadoRepository.findMunicipiosByEstado(id);
    },
};