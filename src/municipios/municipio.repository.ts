import { PrismaClient, Estado, Municipio} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { prisma } from '../lib/prisma';


export const municipioRepository ={
 
    findAll: (): Promise<Municipio[]> =>{
        return prisma.municipio.findMany({
            select: {
                id: true,
                clave: true,
                nombre: true,
                estadoId: true,
            },
            orderBy: {
                id: 'asc'
            }
        });
    },

    findById: (id: number): Promise<Municipio | null> => {
        return prisma.municipio.findUnique({ where: { id } });
    },

    findComunidadesByMunicipio: (municipioId: number) => {
        return prisma.comunidad.findMany({
            where:   { municipioId, status: 'ACTIVO' },
            select:  { id: true, nombre: true, slug: true, irsuActual: true, color: true },
            orderBy: { nombre: 'asc' },
        });
    },

    findByClave: (clave: string): Promise<Municipio | null> => {
            return prisma.municipio.findUnique({
                where: { clave}
            });
        },
    
    findByNombre: (nombre: string): Promise<Municipio | null> => {
        return prisma.municipio.findFirst({
            where: { nombre:{
                equals: nombre,
                mode: 'insensitive'
            } }
        });
    },



   
};