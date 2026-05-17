// Acceso a datos. Abstrae Prisma del resto de la aplicación.
// Solo esta capa conoce @prisma/client.
import { Usuario } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const authRepository = {
  findByEmail: (email: string): Promise<Usuario | null> => {
    return prisma.usuario.findUnique({ where: { email } });
  },

  create: (data: {
    email:        string;
    passwordHash: string;
    nombre?:      string;
    municipioId?: number;
    comunidadId?: number;
  }): Promise<Usuario> => {
    return prisma.usuario.create({ data });
  },
};