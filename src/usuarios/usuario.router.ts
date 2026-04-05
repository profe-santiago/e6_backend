import { Router, Request, Response } from 'express';
import { usuarioService } from './usuario.service';
import {
  createAdminSchema,
  createCoordinadorSchema,
  idParamSchema,
  filtrosUsuarioSchema,
} from './usuario.schema';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const usuarioRouter = Router();

// Todos los endpoints de usuarios requieren autenticación
usuarioRouter.use(authenticate);

/**
 * @swagger
 * /api/v1/usuarios/perfil:
 *   get:
 *     summary: Ver perfil del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *       401:
 *         description: Token requerido
 */
usuarioRouter.get('/perfil', async (req: Request, res: Response) => {
  const perfil = await usuarioService.getPerfil(req.user!.sub);
  res.json(perfil);
});

/**
 * @swagger
 * /api/v1/usuarios:
 *   get:
 *     summary: Listar usuarios con filtros (RF-05-6) — ADMIN, COORDINADOR, SUPER_ADMIN
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: rol
 *         schema:
 *           type: string
 *           enum: [SUPER_ADMIN, ADMIN, COORDINADOR, USUARIO]
 *       - in: query
 *         name: activo
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: municipioId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: comunidadId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista paginada de usuarios
 *       400:
 *         description: Filtros inválidos
 *       403:
 *         description: Sin permisos suficientes
 */
usuarioRouter.get(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN', 'COORDINADOR'),
  async (req: Request, res: Response) => {
    const parsed = filtrosUsuarioSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const result = await usuarioService.getAll(parsed.data, req.user!);
    res.json(result);
  }
);

/**
 * @swagger
 * /api/v1/usuarios/{id}:
 *   get:
 *     summary: Obtener un usuario por ID — ADMIN o SUPER_ADMIN
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Usuario no encontrado
 */
usuarioRouter.get(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: Request, res: Response) => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const usuario = await usuarioService.getById(parsed.data.id);
    res.json(usuario);
  }
);

/**
 * @swagger
 * /api/v1/usuarios/admin:
 *   post:
 *     summary: Crear un ADMIN de municipio — solo SUPER_ADMIN
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, municipioId]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               nombre:
 *                 type: string
 *               municipioId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: ADMIN creado
 *       400:
 *         description: Datos inválidos o email duplicado
 *       403:
 *         description: Solo SUPER_ADMIN puede crear administradores
 *       404:
 *         description: Municipio no encontrado
 */
usuarioRouter.post(
  '/admin',
  authorize('SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    const parsed = createAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const usuario = await usuarioService.createAdmin(parsed.data, req.user!);
    res.status(201).json(usuario);
  }
);

/**
 * @swagger
 * /api/v1/usuarios/coordinador:
 *   post:
 *     summary: Crear un COORDINADOR de comunidad — SUPER_ADMIN o ADMIN
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, comunidadId]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               nombre:
 *                 type: string
 *               comunidadId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: COORDINADOR creado
 *       400:
 *         description: Datos inválidos, email duplicado o comunidad inactiva
 *       403:
 *         description: Sin permisos suficientes
 *       404:
 *         description: Comunidad no encontrada
 */
usuarioRouter.post(
  '/coordinador',
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: Request, res: Response) => {
    const parsed = createCoordinadorSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const usuario = await usuarioService.createCoordinador(parsed.data, req.user!);
    res.status(201).json(usuario);
  }
);

/**
 * @swagger
 * /api/v1/usuarios/{id}/desactivar:
 *   patch:
 *     summary: Desactivar un usuario — ADMIN o SUPER_ADMIN
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario desactivado
 *       400:
 *         description: No puedes desactivar tu propia cuenta
 *       403:
 *         description: Sin permisos suficientes
 *       404:
 *         description: Usuario no encontrado
 */
usuarioRouter.patch(
  '/:id/desactivar',
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: Request, res: Response) => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const usuario = await usuarioService.desactivar(parsed.data.id, req.user!);
    res.json(usuario);
  }
);

/**
 * @swagger
 * /api/v1/usuarios/{id}/activar:
 *   patch:
 *     summary: Activar un usuario — ADMIN o SUPER_ADMIN
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario activado
 *       403:
 *         description: Sin permisos suficientes
 *       404:
 *         description: Usuario no encontrado
 */
usuarioRouter.patch(
  '/:id/activar',
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: Request, res: Response) => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const usuario = await usuarioService.activar(parsed.data.id, req.user!);
    res.json(usuario);
  }
);