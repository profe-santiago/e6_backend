import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppError } from '../lib/app-error';
import { authRepository } from './auth.repository';
import { RegisterInput, LoginInput, RefreshInput } from './auth.schema';
import { TokenPayload, AuthResponse } from './auth.types';
import { config } from '../config';
import { prisma } from '../lib/prisma';

const signToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: config.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload as object, config.JWT_SECRET, options);
};

const buildResponse = async (usuario: {
  id: number; email: string; nombre: string | null; rol: any;
  municipioId?: number | null; comunidadId?: number | null;
}): Promise<AuthResponse> => {
  const token = signToken({
    sub:         usuario.id,
    email:       usuario.email,
    rol:         usuario.rol,
    comunidadId: usuario.comunidadId ?? undefined,
    municipioId: usuario.municipioId ?? undefined,
  });

  const { token: refreshToken } = await authRepository.createRefreshToken(usuario.id);

  return {
    token,
    refreshToken,
    usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol },
  };
};

export const authService = {
  register: async (data: RegisterInput): Promise<AuthResponse> => {
    const existing = await authRepository.findByEmail(data.email);
    if (existing) throw new AppError(400, 'El email ya está registrado');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const usuario = await authRepository.create({
      email: data.email, passwordHash, nombre: data.nombre,
    });

    return buildResponse(usuario);
  },

  login: async (data: LoginInput): Promise<AuthResponse> => {
    const usuario = await authRepository.findByEmail(data.email);
    if (!usuario) throw new AppError(401, 'Credenciales inválidas');
    if (!usuario.activo) throw new AppError(403, 'Cuenta desactivada');

    const valid = await bcrypt.compare(data.password, usuario.passwordHash);
    if (!valid) throw new AppError(401, 'Credenciales inválidas');

    return buildResponse(usuario);
  },

  refresh: async (data: RefreshInput): Promise<Pick<AuthResponse, 'token' | 'refreshToken'>> => {
    const stored = await authRepository.findRefreshToken(data.refreshToken);

    if (!stored)                          throw new AppError(401, 'Refresh token inválido');
    if (stored.revokedAt)                 throw new AppError(401, 'Refresh token revocado');
    if (stored.expiresAt < new Date())    throw new AppError(401, 'Refresh token expirado');

    // Rotación: revoca el actual y emite uno nuevo
    await authRepository.revokeRefreshToken(data.refreshToken);

    const usuario = await prisma.usuario.findUnique({
      where:  { id: stored.usuarioId },
      select: { id: true, email: true, nombre: true, rol: true, activo: true, municipioId: true, comunidadId: true },
    });

    if (!usuario || !usuario.activo) throw new AppError(401, 'Usuario inactivo o no encontrado');

    const token = signToken({
      sub:         usuario.id,
      email:       usuario.email,
      rol:         usuario.rol,
      comunidadId: usuario.comunidadId ?? undefined,
      municipioId: usuario.municipioId ?? undefined,
    });

    const { token: refreshToken } = await authRepository.createRefreshToken(usuario.id);

    return { token, refreshToken };
  },

  logout: async (data: RefreshInput): Promise<void> => {
    const stored = await authRepository.findRefreshToken(data.refreshToken);
    if (!stored || stored.revokedAt) return; // idempotente
    await authRepository.revokeRefreshToken(data.refreshToken);
  },
};