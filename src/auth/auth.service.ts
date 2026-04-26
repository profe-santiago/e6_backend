import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppError } from '../lib/app-error';
import { authRepository } from './auth.repository';
import { RegisterInput, LoginInput } from './auth.schema';
import { JwtPayload, AuthResponse } from './auth.types';
import { config } from '../config';

const signToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: config.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload as object, config.JWT_SECRET, options);
};

export const authService = {
  register: async (data: RegisterInput): Promise<AuthResponse> => {
    const existing = await authRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError(400, 'El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const usuario = await authRepository.create({
      email: data.email,
      passwordHash,
      nombre: data.nombre,
    });

    const token = signToken({
      sub:   usuario.id,
      email: usuario.email,
      rol:   usuario.rol,
    });

    return {
      token,
      usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol },
    };
  },

  login: async (data: LoginInput): Promise<AuthResponse> => {
    const usuario = await authRepository.findByEmail(data.email);
    if (!usuario) {
      throw new AppError(401, 'Credenciales inválidas');
    }

    if (!usuario.activo) {
      throw new AppError(403, 'Cuenta desactivada');
    }

    const valid = await bcrypt.compare(data.password, usuario.passwordHash);
    if (!valid) {
      throw new AppError(401, 'Credenciales inválidas');
    }

    const token = signToken({
      sub:         usuario.id,
      email:       usuario.email,
      rol:         usuario.rol,
      comunidadId: usuario.comunidadId ?? undefined,
      municipioId: usuario.municipioId ?? undefined,
    });

    return {
      token,
      usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol },
    };
  },
};