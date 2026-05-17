import { Router, Request, Response } from 'express';
import { usuarioService } from './usuario.service';
import {
  createAdminSchema,
  createCoordinadorSchema,
  createOperadorSchema,
  idParamSchema,
  filtrosUsuarioSchema,
} from './usuario.schema';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const usuarioRouter = Router();

usuarioRouter.use(authenticate);

/**
 * @swagger
 * /api/v1/usuarios/perfil:
 *   get:
 *     summary: Obtener el perfil del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario autenticado con municipio y comunidad asignados
 *       401:
 *         description: Token requerido
 */
usuarioRouter.get('/perfil', async (req: Request, res: Response): Promise<void> => {
  const perfil = await usuarioService.getPerfil(req.user!.sub);
  res.json(perfil);
});

/**
 * @swagger
 * /api/v1/usuarios:
 *   get:
 *     summary: Listar usuarios con filtros — autoridades
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: rol
 *         schema:
 *           type: string
 *           enum: [SUPER_ADMIN, ADMIN, COORDINADOR, USUARIO, OPERADOR]
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
 *         description: Lista paginada de usuarios. ADMIN ve solo su municipio, COORDINADOR ve solo su comunidad.
 *       401:
 *         description: Token requerido
 *       403:
 *         description: Sin permisos suficientes
 */
usuarioRouter.get(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN', 'COORDINADOR'),
  async (req: Request, res: Response): Promise<void> => {
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
 *     summary: Obtener un usuario por ID — solo ADMIN o SUPER_ADMIN
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
 *         description: Datos del usuario
 *       400:
 *         description: ID inválido
 *       401:
 *         description: Token requerido
 *       403:
 *         description: Sin permisos suficientes
 *       404:
 *         description: Usuario no encontrado
 */
usuarioRouter.get(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
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
 *     summary: Crear un usuario ADMIN — solo SUPER_ADMIN
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
 *                 description: Municipio que administrará este ADMIN
 *                 example: 1
 *     responses:
 *       201:
 *         description: Usuario ADMIN creado
 *       400:
 *         description: Email ya registrado o datos inválidos
 *       401:
 *         description: Token requerido
 *       403:
 *         description: Solo SUPER_ADMIN puede crear administradores
 *       404:
 *         description: Municipio no encontrado
 */
usuarioRouter.post(
  '/admin',
  authorize('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
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
 *     summary: Crear un usuario COORDINADOR — ADMIN o SUPER_ADMIN
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
 *                 description: Comunidad que coordinará. Debe estar en estado ACTIVO.
 *                 example: 10
 *     responses:
 *       201:
 *         description: Usuario COORDINADOR creado
 *       400:
 *         description: Email ya registrado, comunidad inactiva, o datos inválidos
 *       401:
 *         description: Token requerido
 *       403:
 *         description: ADMIN no puede crear coordinadores fuera de su municipio
 *       404:
 *         description: Comunidad no encontrada
 */
usuarioRouter.post(
  '/coordinador',
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
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
 * /api/v1/usuarios/operador:
 *   post:
 *     summary: Crear un usuario OPERADOR de cuadrilla — ADMIN o SUPER_ADMIN
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
 *                 description: Municipio al que pertenece el operador
 *                 example: 1
 *     responses:
 *       201:
 *         description: Usuario OPERADOR creado. Solo puede ver y actualizar asignaciones de cuadrilla.
 *       400:
 *         description: Email ya registrado o datos inválidos
 *       401:
 *         description: Token requerido
 *       403:
 *         description: ADMIN no puede crear operadores fuera de su municipio
 *       404:
 *         description: Municipio no encontrado
 */
usuarioRouter.post(
  '/operador',
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = createOperadorSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const usuario = await usuarioService.createOperador(parsed.data, req.user!);
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
 *         description: Usuario desactivado. No puede iniciar sesión hasta ser reactivado.
 *       400:
 *         description: No puedes desactivar tu propia cuenta
 *       401:
 *         description: Token requerido
 *       403:
 *         description: No se puede desactivar a un SUPER_ADMIN o a usuarios de otro municipio
 *       404:
 *         description: Usuario no encontrado
 */
usuarioRouter.patch(
  '/:id/desactivar',
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
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
 *     summary: Reactivar un usuario desactivado — ADMIN o SUPER_ADMIN
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
 *         description: Usuario reactivado
 *       401:
 *         description: Token requerido
 *       403:
 *         description: Sin permisos suficientes
 *       404:
 *         description: Usuario no encontrado
 */
usuarioRouter.patch(
  '/:id/activar',
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const usuario = await usuarioService.activar(parsed.data.id, req.user!);
    res.json(usuario);
  }
);