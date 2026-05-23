import { Usuario } from '@prisma/client';
import { prisma } from '../lib/prisma';

// Días de vida del refresh token (configurable)
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 7);

export const authRepository = {
  findByEmail: (email: string): Promise<Usuario | null> =>
    prisma.usuario.findUnique({ where: { email } }),

  create: (data: {
    email:        string;
    passwordHash: string;
    nombre?:      string;
    municipioId?: number;
    comunidadId?: number;
  }): Promise<Usuario> =>
    prisma.usuario.create({ data }),

  // ── Refresh tokens ──────────────────────────────────────────────────────

  createRefreshToken: (usuarioId: number) => {
    const token     = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_DAYS);
    return prisma.refreshToken.create({
      data: { token, usuarioId, expiresAt },
      select: { token: true },
    });
  },

  findRefreshToken: (token: string) =>
    prisma.refreshToken.findUnique({
      where:  { token },
      select: { id: true, usuarioId: true, expiresAt: true, revokedAt: true },
    }),

  revokeRefreshToken: (token: string) =>
    prisma.refreshToken.update({
      where: { token },
      data:  { revokedAt: new Date() },
    }),

  revokeAllUserTokens: (usuarioId: number) =>
    prisma.refreshToken.updateMany({
      where: { usuarioId, revokedAt: null },
      data:  { revokedAt: new Date() },
    }),
};